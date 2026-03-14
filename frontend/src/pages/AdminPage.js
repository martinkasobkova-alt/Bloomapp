import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  Users, Shield, Newspaper, Stethoscope, Star, Clock,
  Briefcase, Settings, Flag, KeyRound, Bug, Ban, BadgeCheck,
} from 'lucide-react';

import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminNewsTab } from '../components/admin/AdminNewsTab';
import { AdminSpecialistsTab } from '../components/admin/AdminSpecialistsTab';
import { AdminReviewsTab } from '../components/admin/AdminReviewsTab';
import { AdminServicesTab } from '../components/admin/AdminServicesTab';
import { AdminPendingTab } from '../components/admin/AdminPendingTab';
import { AdminContentTab } from '../components/admin/AdminContentTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { AdminBugReportsTab } from '../components/admin/AdminBugReportsTab';
import { AdminVerificationTab } from '../components/admin/AdminVerificationTab';
import { useAdminData } from '../hooks/useAdminData';

const AdminPage = () => {
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const d = useAdminData();

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white border border-border/50 rounded-xl p-8 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-bloom-violet/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-bloom-violet/50" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-bloom-text mb-2">Přístup odepřen</h2>
        <p className="text-sm text-bloom-sub mb-4">Tato sekce je dostupná pouze pro administrátory.</p>
        <div className="bg-muted/50 rounded-lg p-4 text-left text-xs text-bloom-sub space-y-1.5">
          <p className="font-medium text-bloom-text">Jak získat přístup administrátora:</p>
          <p>1. Zaregistrujte se jako běžný uživatel</p>
          <p>2. Zavolejte: <code className="bg-muted px-1 py-0.5 rounded">POST /api/admin/setup-first-admin</code></p>
          <p>3. S JSON tělem: <code className="bg-muted px-1 py-0.5 rounded">email</code>, <code className="bg-muted px-1 py-0.5 rounded">secret</code> (ADMIN_SETUP_SECRET z .env)</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-6" data-testid="admin-page">
      <div className="pride-bar mb-6" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mt-10 mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bloom-text mb-1">Administrace</h1>
          <p className="text-bloom-sub text-sm">Správa uživatelů, obsahu a moderace komunity</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Uživatelů', value: d.users.length, icon: Users, color: 'text-bloom-violet bg-bloom-violet/10' },
            { label: 'Aktualit', value: d.news.length, icon: Newspaper, color: 'text-bloom-mint bg-bloom-mint/10' },
            { label: 'Odborníků', value: d.specialists.length, icon: Stethoscope, color: 'text-bloom-pride-blue bg-bloom-pride-blue/10' },
            { label: 'Zablokovaných', value: d.users.filter(u => u.role === 'banned').length, icon: Ban, color: 'text-destructive bg-destructive/10' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-border/50 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bloom-text">{s.value}</p>
                <p className="text-xs text-bloom-sub">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-5">
          <TabsList className="bg-white border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm"><Users className="w-3.5 h-3.5" />Uživatelé</TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1.5 text-xs sm:text-sm"><Newspaper className="w-3.5 h-3.5" />Aktuality</TabsTrigger>
            <TabsTrigger value="specialists" className="flex items-center gap-1.5 text-xs sm:text-sm"><Stethoscope className="w-3.5 h-3.5" />Odborníci</TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs sm:text-sm relative" onClick={d.fetchPending}>
              <Clock className="w-3.5 h-3.5" />Ke schválení
              {d.pendingSpecialists.length > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{d.pendingSpecialists.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1.5 text-xs sm:text-sm" onClick={d.fetchReviews}><Star className="w-3.5 h-3.5" />Recenze</TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-1.5 text-xs sm:text-sm" onClick={d.fetchServices}><Briefcase className="w-3.5 h-3.5" />Nabídky</TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1.5 text-xs sm:text-sm" onClick={() => { d.fetchContent(); d.fetchMarkerColors(); d.fetchSectionSettings(); d.fetchFeaturedItems(); }}><Settings className="w-3.5 h-3.5" />Obsah</TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm relative" onClick={d.fetchReports} data-testid="reports-tab">
              <Flag className="w-3.5 h-3.5" />Nahlášení
              {d.reports.filter(r => r.status === 'open').length > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{d.reports.filter(r => r.status === 'open').length}</span>}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs sm:text-sm" onClick={() => { d.fetchCommunityPassword(); d.fetchContactEmail(); d.fetchOfferExpiryDays(); }} data-testid="settings-tab"><KeyRound className="w-3.5 h-3.5" />Nastavení</TabsTrigger>
            <TabsTrigger value="bug-reports" className="flex items-center gap-1.5 text-xs sm:text-sm relative" onClick={d.fetchBugReports} data-testid="bug-reports-tab">
              <Bug className="w-3.5 h-3.5" />Bug reports
              {d.bugReports.filter(r => r.status === 'new').length > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{d.bugReports.filter(r => r.status === 'new').length}</span>}
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-1.5 text-xs sm:text-sm relative" onClick={d.fetchVerificationRequests} data-testid="verification-tab-trigger">
              <BadgeCheck className="w-3.5 h-3.5" />Ověření
              {d.verificationRequests.filter(r => r.status === 'pending').length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{d.verificationRequests.filter(r => r.status === 'pending').length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" data-testid="users-tab-content">
            <AdminUsersTab
              users={d.users} loading={d.loading} currentUser={currentUser} isSuperAdmin={isSuperAdmin}
              userSearch={d.userSearch} setUserSearch={d.setUserSearch}
              handleSetRole={d.handleSetRole} handleDeleteUser={d.handleDeleteUser}
              handleAdminSendReset={d.handleAdminSendReset}
              handleSetSpecializationLabel={d.handleSetSpecializationLabel}
            />
          </TabsContent>

          <TabsContent value="news" data-testid="news-tab-content">
            <AdminNewsTab
              news={d.news} newsCatsApi={d.newsCatsApi}
              showNewsForm={d.showNewsForm} setShowNewsForm={d.setShowNewsForm}
              newsForm={d.newsForm} setNewsForm={d.setNewsForm}
              newsLoading={d.newsLoading} handleCreateNews={d.handleCreateNews}
              handleDeleteNews={d.handleDeleteNews} handleUpdateNews={d.handleUpdateNews}
            />
          </TabsContent>

          <TabsContent value="specialists" data-testid="specialists-tab-content">
            <AdminSpecialistsTab
              specialists={d.specialists} locations={d.locations}
              showSpecialistForm={d.showSpecialistForm} setShowSpecialistForm={d.setShowSpecialistForm}
              specForm={d.specForm} setSpecForm={d.setSpecForm}
              specLoading={d.specLoading} handleCreateSpecialist={d.handleCreateSpecialist}
              handleDeleteSpecialist={d.handleDeleteSpecialist} handleEditSpecialist={d.handleEditSpecialist}
            />
          </TabsContent>

          <TabsContent value="pending" data-testid="pending-tab-content">
            <AdminPendingTab
              pendingSpecialists={d.pendingSpecialists}
              handleApproveSpecialist={d.handleApproveSpecialist}
              handleRejectSpecialist={d.handleRejectSpecialist}
            />
          </TabsContent>

          <TabsContent value="reviews" data-testid="reviews-tab-content">
            <AdminReviewsTab reviews={d.reviews} handleDeleteReview={d.handleDeleteReview} handleUpdateReview={d.handleUpdateReview} />
          </TabsContent>

          <TabsContent value="services" data-testid="services-tab-content">
            <AdminServicesTab
              services={d.services} selectedService={d.selectedService}
              setSelectedService={d.setSelectedService}
              handleDeleteService={d.handleDeleteService}
              handleReactivateService={d.handleReactivateService}
            />
          </TabsContent>

          <TabsContent value="content" data-testid="content-tab-content">
            <AdminContentTab
              serviceTypes={d.serviceTypes} locations={d.locations}
              articleCats={d.articleCats} specCats={d.specCats} newsCatsApi={d.newsCatsApi}
              textSettings={d.textSettings} editingTextKey={d.editingTextKey}
              setEditingTextKey={d.setEditingTextKey} editingTextValue={d.editingTextValue}
              setEditingTextValue={d.setEditingTextValue}
              markerColors={d.markerColors} editingColors={d.editingColors}
              setEditingColors={d.setEditingColors} draftColors={d.draftColors}
              setDraftColors={d.setDraftColors}
              sectionSettings={d.sectionSettings} editingSections={d.editingSections}
              setEditingSections={d.setEditingSections} draftSections={d.draftSections}
              setDraftSections={d.setDraftSections}
              featuredItems={d.featuredItems} specialists={d.specialists} news={d.news}
              newServiceType={d.newServiceType} setNewServiceType={d.setNewServiceType}
              editingServiceType={d.editingServiceType} setEditingServiceType={d.setEditingServiceType}
              editingServiceTypeName={d.editingServiceTypeName} setEditingServiceTypeName={d.setEditingServiceTypeName}
              newLocation={d.newLocation} setNewLocation={d.setNewLocation}
              newLocationCountry={d.newLocationCountry} setNewLocationCountry={d.setNewLocationCountry}
              editingLocation={d.editingLocation} setEditingLocation={d.setEditingLocation}
              editingLocationName={d.editingLocationName} setEditingLocationName={d.setEditingLocationName}
              editingLocationCountry={d.editingLocationCountry} setEditingLocationCountry={d.setEditingLocationCountry}
              newArticleCat={d.newArticleCat} setNewArticleCat={d.setNewArticleCat}
              newSpecCat={d.newSpecCat} setNewSpecCat={d.setNewSpecCat}
              editingSpecCat={d.editingSpecCat} setEditingSpecCat={d.setEditingSpecCat}
              editingSpecCatName={d.editingSpecCatName} setEditingSpecCatName={d.setEditingSpecCatName}
              newNewsCat={d.newNewsCat} setNewNewsCat={d.setNewNewsCat}
              editingNewsCat={d.editingNewsCat} setEditingNewsCat={d.setEditingNewsCat}
              editingNewsCatName={d.editingNewsCatName} setEditingNewsCatName={d.setEditingNewsCatName}
              handleAddServiceType={d.handleAddServiceType} handleSaveServiceType={d.handleSaveServiceType}
              handleDeleteServiceType={d.handleDeleteServiceType}
              handleAddLocation={d.handleAddLocation} handleSaveLocation={d.handleSaveLocation}
              handleDeleteLocation={d.handleDeleteLocation}
              handleAddArticleCat={d.handleAddArticleCat} handleDeleteArticleCat={d.handleDeleteArticleCat}
              handleUpdateArticleCatRoles={d.handleUpdateArticleCatRoles}
              handleAddNewsCat={d.handleAddNewsCat} handleSaveNewsCat={d.handleSaveNewsCat}
              handleDeleteNewsCat={d.handleDeleteNewsCat}
              handleUpdateNewsCatRoles={d.handleUpdateNewsCatRoles}
              handleAddSpecCat={d.handleAddSpecCat} handleDeleteSpecCat={d.handleDeleteSpecCat}
              handleSaveSpecCat={d.handleSaveSpecCat}
              handleSaveText={d.handleSaveText}
              handleSaveMarkerColors={d.handleSaveMarkerColors}
              handleSaveSectionSettings={d.handleSaveSectionSettings}
              fetchSectionSettings={d.fetchSectionSettings}
              handleToggleFeatured={d.handleToggleFeatured}
              handleMoveFeatured={d.handleMoveFeatured}
              fetchFeaturedItems={d.fetchFeaturedItems}
            />
          </TabsContent>

          <TabsContent value="reports" data-testid="reports-tab-content">
            <AdminReportsTab reports={d.reports} handleResolveReport={d.handleResolveReport} handleDeleteReport={d.handleDeleteReport} />
          </TabsContent>

          <TabsContent value="settings" data-testid="settings-tab-content">
            <AdminSettingsTab
              communityPassword={d.communityPassword}
              newCommunityPassword={d.newCommunityPassword} setNewCommunityPassword={d.setNewCommunityPassword}
              showCommunityPw={d.showCommunityPw} setShowCommunityPw={d.setShowCommunityPw}
              entryPasswordEnabled={d.entryPasswordEnabled}
              contactEmail={d.contactEmail}
              newContactEmail={d.newContactEmail} setNewContactEmail={d.setNewContactEmail}
              offerExpiryDays={d.offerExpiryDays}
              handleUpdateCommunityPassword={d.handleUpdateCommunityPassword}
              handleToggleEntryPassword={d.handleToggleEntryPassword}
              handleUpdateContactEmail={d.handleUpdateContactEmail}
              handleUpdateOfferExpiryDays={d.handleUpdateOfferExpiryDays}
            />
          </TabsContent>

          <TabsContent value="bug-reports" data-testid="bug-reports-tab-content">
            <AdminBugReportsTab
              bugReports={d.bugReports}
              expandedBugReport={d.expandedBugReport} setExpandedBugReport={d.setExpandedBugReport}
              handleUpdateBugStatus={d.handleUpdateBugStatus}
              handleDeleteBugReport={d.handleDeleteBugReport}
            />
          </TabsContent>

          <TabsContent value="verification" data-testid="verification-tab-content">
            <AdminVerificationTab
              requests={d.verificationRequests}
              onUpdateStatus={d.handleUpdateVerificationStatus}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
