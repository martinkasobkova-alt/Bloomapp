import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, UserCog, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { getAvatarImage } from '../Layout';
import { roleLabels, roleColors } from './shared';
import { AdminSortControl, USER_SORT_OPTIONS, sortByName, sortByDate } from './AdminSortControl';

export function AdminUsersTab({
  users, loading, currentUser, isSuperAdmin,
  userSearch, setUserSearch,
  handleSetRole, handleDeleteUser, handleAdminSendReset,
  handleSetSpecializationLabel,
}) {
  const navigate = useNavigate();
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');

  const filteredUsers = userSearch
    ? users.filter(u => u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const sortedUsers = useMemo(() => {
    if (sortOrder === 'name-asc' || sortOrder === 'name-desc') {
      return sortByName(filteredUsers, sortOrder);
    }
    return sortByDate(filteredUsers, sortOrder, 'created_at');
  }, [filteredUsers, sortOrder]);

  const startEditLabel = (u, e) => {
    e.stopPropagation();
    setEditingLabel(u.id);
    setLabelDraft(u.specialization_label || '');
  };

  const saveLabel = async (userId, e) => {
    e.stopPropagation();
    await handleSetSpecializationLabel(userId, labelDraft);
    setEditingLabel(null);
  };

  const cancelLabel = (e) => {
    e.stopPropagation();
    setEditingLabel(null);
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
          <Input
            placeholder="Hledat uživatele..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-10"
            data-testid="user-search-input"
          />
        </div>
        <AdminSortControl value={sortOrder} onChange={setSortOrder} options={USER_SORT_OPTIONS} testId="users-sort" />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <div className="space-y-2">
          {sortedUsers.length === 0 && <p className="text-sm text-bloom-sub text-center py-8">Žádní uživatelé.</p>}
          {sortedUsers.map(u => (
            <Card key={u.id} className="bg-white border-border/50 cursor-pointer hover:border-bloom-violet/40 transition-colors" data-testid={`admin-user-${u.id}`} onClick={() => navigate(`/users/${u.id}`)}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={getAvatarImage(u.avatar, u.custom_avatar)} />
                    <AvatarFallback className="bg-bloom-violet text-white text-xs">{u.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-bloom-text hover:text-bloom-violet transition-colors">{u.username}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleColors[u.role] || 'bg-muted text-bloom-sub'}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                      {u.email_verified === false && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Neověřený email</span>
                      )}
                    </div>
                    <p className="text-xs text-bloom-sub truncate">{u.email}{u.location ? ` · ${u.location}` : ''}</p>
                  </div>
                  {u.id !== currentUser?.id && (isSuperAdmin || !['admin', 'superadmin'].includes(u.role)) && (
                    <Select value={u.role} onValueChange={(v) => { handleSetRole(u.id, v); }} onClick={e => e.stopPropagation()}>
                      <SelectTrigger className="w-36 sm:w-44 h-8 text-xs" data-testid={`role-select-${u.id}`}>
                        <UserCog className="w-3 h-3 mr-1 shrink-0" /><SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Uživatel</SelectItem>
                        {isSuperAdmin && <SelectItem value="admin">Administrátor</SelectItem>}
                        {isSuperAdmin && <SelectItem value="superadmin">Superadministrátor</SelectItem>}
                        <SelectItem value="lawyer">Právník</SelectItem>
                        <SelectItem value="specialist">Ověřený specialista</SelectItem>
                        <SelectItem value="banned">Zablokovat</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {u.id !== currentUser?.id && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm" variant="outline"
                        className="h-8 text-xs border-bloom-violet/30 text-bloom-violet hover:bg-bloom-violet/10"
                        onClick={() => handleAdminSendReset(u.id, u.email)}
                        title="Odeslat reset hesla" data-testid={`reset-user-${u.id}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      {(isSuperAdmin || !['admin', 'superadmin'].includes(u.role)) && (
                        <Button
                          size="sm" variant="outline"
                          className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title="Smazat uživatele" data-testid={`delete-user-${u.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Specialization label row — only for specialist / lawyer */}
                {['specialist', 'lawyer'].includes(u.role) && (
                  <div className="flex items-center gap-2 pl-12" onClick={e => e.stopPropagation()}>
                    <span className="text-[11px] text-bloom-sub shrink-0">Specializace:</span>
                    {editingLabel === u.id ? (
                      <>
                        <Input
                          value={labelDraft}
                          onChange={e => setLabelDraft(e.target.value)}
                          placeholder="např. plastický chirurg, pracovní právo..."
                          className="h-7 text-xs flex-1"
                          autoFocus
                          data-testid={`spec-label-input-${u.id}`}
                          onKeyDown={e => { if (e.key === 'Enter') saveLabel(u.id, e); if (e.key === 'Escape') cancelLabel(e); }}
                        />
                        <button onClick={e => saveLabel(u.id, e)} className="p-1 text-emerald-600 hover:text-emerald-700" data-testid={`spec-label-save-${u.id}`}><Check className="w-4 h-4" /></button>
                        <button onClick={cancelLabel} className="p-1 text-bloom-sub hover:text-destructive"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-bloom-text italic flex-1 truncate" data-testid={`spec-label-value-${u.id}`}>
                          {u.specialization_label || <span className="text-bloom-sub/50">Nenastaveno</span>}
                        </span>
                        <button onClick={e => startEditLabel(u, e)} className="p-1 text-bloom-sub hover:text-bloom-violet" data-testid={`spec-label-edit-${u.id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
