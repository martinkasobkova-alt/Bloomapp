import React from 'react';
import { KeyRound, Mail, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function AdminSettingsTab({
  communityPassword, newCommunityPassword, setNewCommunityPassword,
  showCommunityPw, setShowCommunityPw, entryPasswordEnabled,
  contactEmail, newContactEmail, setNewContactEmail,
  offerExpiryDays,
  handleUpdateCommunityPassword, handleToggleEntryPassword,
  handleUpdateContactEmail, handleUpdateOfferExpiryDays,
}) {
  return (
    <div className="max-w-lg space-y-5">
      {/* Entry Password */}
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-bloom-violet" />Ochrana vstupním heslem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium text-bloom-text">Vyžadovat heslo pro registraci</p>
              <p className="text-xs text-bloom-sub mt-0.5">
                {entryPasswordEnabled ? 'Uživatelé musí zadat komunitní heslo při registraci' : 'Registrace je otevřená bez hesla'}
              </p>
            </div>
            <button
              onClick={() => handleToggleEntryPassword(!entryPasswordEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${entryPasswordEnabled ? 'bg-bloom-violet' : 'bg-gray-300'}`}
              data-testid="toggle-entry-password-btn"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${entryPasswordEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {entryPasswordEnabled && (
            <>
              <div>
                <p className="text-xs text-bloom-sub mb-2">Aktuální heslo:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted/30 rounded-lg font-mono text-sm text-bloom-text">
                    {showCommunityPw ? communityPassword : '\u2022'.repeat(communityPassword.length || 12)}
                  </div>
                  <Button size="sm" variant="ghost" className="text-bloom-sub" onClick={() => setShowCommunityPw(p => !p)} data-testid="toggle-password-visibility">
                    {showCommunityPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-bloom-text">Nové heslo:</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCommunityPassword}
                    onChange={e => setNewCommunityPassword(e.target.value)}
                    placeholder="Zadejte nové heslo..."
                    className="flex-1"
                    data-testid="new-community-password-input"
                    onKeyDown={e => e.key === 'Enter' && handleUpdateCommunityPassword()}
                  />
                  <Button className="bg-bloom-violet text-white" onClick={handleUpdateCommunityPassword} data-testid="save-community-password-btn">
                    Uložit
                  </Button>
                </div>
                <p className="text-xs text-bloom-sub">Změna se projeví okamžitě pro nové registrace.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Email */}
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Mail className="w-4 h-4 text-bloom-violet" />Kontaktní email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-bloom-sub mb-2">Aktuální email:</p>
            <div className="px-3 py-2 bg-muted/30 rounded-lg text-sm text-bloom-text font-mono">{contactEmail || 'Nenastaven'}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-bloom-text">Nový kontaktní email:</Label>
            <div className="flex gap-2">
              <Input
                value={newContactEmail}
                onChange={e => setNewContactEmail(e.target.value)}
                placeholder="email@example.cz"
                type="email"
                className="flex-1"
                data-testid="new-contact-email-input"
                onKeyDown={e => e.key === 'Enter' && handleUpdateContactEmail()}
              />
              <Button className="bg-bloom-violet text-white" onClick={handleUpdateContactEmail} data-testid="save-contact-email-btn">
                Uložit
              </Button>
            </div>
            <p className="text-xs text-bloom-sub">Tento email se zobrazuje jako kontakt v patičce a na stránkách komunity.</p>
          </div>
        </CardContent>
      </Card>

      {/* Offer Expiry */}
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-bloom-violet" />Platnost nabídek (Vzájemná pomoc)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-bloom-sub mb-2">Aktuální nastavení:</p>
            <div className="px-3 py-2 bg-muted/30 rounded-lg text-sm text-bloom-text font-mono">{offerExpiryDays} dní</div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-bloom-text">Nová délka platnosti:</Label>
            <div className="flex gap-2 flex-wrap">
              {[14, 30, 60, 90].map(d => (
                <Button
                  key={d}
                  size="sm"
                  variant={offerExpiryDays === d ? 'default' : 'outline'}
                  className={offerExpiryDays === d ? 'bg-bloom-violet text-white' : 'border-bloom-violet/30 text-bloom-violet'}
                  onClick={() => handleUpdateOfferExpiryDays(d)}
                  data-testid={`expiry-days-${d}`}
                >
                  {d} dní
                </Button>
              ))}
            </div>
            <p className="text-xs text-bloom-sub">Nové nabídky budou expirovat po zvoleném počtu dní. Stávající nabídky nejsou zpětně ovlivněny.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
