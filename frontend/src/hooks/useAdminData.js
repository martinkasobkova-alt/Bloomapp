import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { API } from '../components/admin/shared';

const roleLabels = {
  user: 'Uživatel', admin: 'Administrátor', lawyer: 'Právník',
  specialist: 'Ověřený specialista', banned: 'Zablokovaný',
};

export function useAdminData() {
  const { isAdmin } = useAuth();
  const { refresh: refreshAppSettings } = useAppSettings();

  // --- Global state ---
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [pendingSpecialists, setPendingSpecialists] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [articleCats, setArticleCats] = useState([]);
  const [specCats, setSpecCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  // News form
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'local', image_url: '' });
  const [newsLoading, setNewsLoading] = useState(false);

  // Specialist form
  const [showSpecialistForm, setShowSpecialistForm] = useState(false);
  const [specForm, setSpecForm] = useState({
    name: '', specialty: 'Psychologie, psychiatrie a sexuologie', description: '', subcategory: '',
    address: '', city: '', region: '', country: 'CZ', phone: '', email: '', website: '',
    lat: '', lng: '', assigned_locations: [],
  });
  const [specLoading, setSpecLoading] = useState(false);

  // Content management
  const [newServiceType, setNewServiceType] = useState('');
  const [editingServiceType, setEditingServiceType] = useState(null);
  const [editingServiceTypeName, setEditingServiceTypeName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLocationCountry, setNewLocationCountry] = useState('CZ');
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState('');
  const [editingLocationCountry, setEditingLocationCountry] = useState('CZ');
  const [newArticleCat, setNewArticleCat] = useState('');
  const [newSpecCat, setNewSpecCat] = useState('');
  const [editingSpecCat, setEditingSpecCat] = useState(null);
  const [editingSpecCatName, setEditingSpecCatName] = useState('');
  const [newsCatsApi, setNewsCatsApi] = useState([]);
  const [newNewsCat, setNewNewsCat] = useState('');
  const [editingNewsCat, setEditingNewsCat] = useState(null);
  const [editingNewsCatName, setEditingNewsCatName] = useState('');

  // Settings
  const [communityPassword, setCommunityPassword] = useState('');
  const [newCommunityPassword, setNewCommunityPassword] = useState('');
  const [showCommunityPw, setShowCommunityPw] = useState(false);
  const [entryPasswordEnabled, setEntryPasswordEnabled] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [offerExpiryDays, setOfferExpiryDays] = useState(30);

  // Reports
  const [reports, setReports] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [expandedBugReport, setExpandedBugReport] = useState(null);

  // Text content settings
  const [textSettings, setTextSettings] = useState({ about_text: '', contact_text: '', help_text: '', footer_text: '' });
  const [editingTextKey, setEditingTextKey] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  // Marker colors & section settings
  const [markerColors, setMarkerColors] = useState({});
  const [editingColors, setEditingColors] = useState(false);
  const [draftColors, setDraftColors] = useState({});
  const [sectionSettings, setSectionSettings] = useState({});
  const [editingSections, setEditingSections] = useState(false);
  const [draftSections, setDraftSections] = useState({});

  // Featured items
  const [featuredItems, setFeaturedItems] = useState([]);

  // Service detail modal
  const [selectedService, setSelectedService] = useState(null);

  // Verification requests
  const [verificationRequests, setVerificationRequests] = useState([]);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  // --- Data fetchers ---
  const fetchAll = async () => {
    try {
      const [u, n, s, locs, vr] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/news`),
        axios.get(`${API}/specialists?sort=name`),
        axios.get(`${API}/locations`),
        axios.get(`${API}/admin/verification-requests`),
      ]);
      setUsers(u.data); setNews(n.data); setSpecialists(s.data); setLocations(locs.data);
      setVerificationRequests(vr.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : status === 403 ? 'Přístup odepřen – odhlaste se a přihlaste znovu' : status === 401 ? 'Platnost přihlášení vypršela – přihlaste se znovu' : 'Nepodařilo se načíst data';
      toast.error(msg);
    }
    finally { setLoading(false); }
  };

  const fetchPending = async () => {
    try { const r = await axios.get(`${API}/admin/specialists/pending`); setPendingSpecialists(r.data); } catch {}
  };
  const fetchReviews = async () => {
    try { const r = await axios.get(`${API}/admin/reviews`); setReviews(r.data); } catch {}
  };
  const fetchServices = async () => {
    try { const r = await axios.get(`${API}/admin/services`); setServices(r.data); } catch {}
  };
  const fetchContent = async () => {
    try {
      const [st, loc, ac, sc, nc] = await Promise.all([
        axios.get(`${API}/service-types`),
        axios.get(`${API}/admin/locations`),
        axios.get(`${API}/admin/article-categories`),
        axios.get(`${API}/admin/specialist-categories`),
        axios.get(`${API}/admin/news-categories`),
      ]);
      setServiceTypes(st.data); setLocations(loc.data); setArticleCats(ac.data);
      setSpecCats(sc.data); setNewsCatsApi(nc.data);
    } catch {}
    fetchTextSettings();
  };
  const fetchTextSettings = async () => {
    try { const r = await axios.get(`${API}/settings/texts`); setTextSettings(r.data); } catch {}
  };
  const fetchMarkerColors = async () => {
    try {
      const r = await axios.get(`${API}/settings/marker-colors`);
      const defaults = { legal: '#8A7CFF', news: '#5BCEFA', community: '#8A7CFF', support: '#A8E6CF', specialists: '#F5A9B8', nearby: '#A8E6CF', messages: '#8A7CFF', profile: '#F5A9B8', featured: '#F5A9B8', default: '#8A7CFF' };
      const merged = { ...defaults, ...r.data };
      setMarkerColors(merged); setDraftColors(merged);
    } catch {}
  };
  const fetchSectionSettings = async () => {
    try {
      const r = await axios.get(`${API}/settings/sections`);
      setSectionSettings(r.data);
      setDraftSections(JSON.parse(JSON.stringify(r.data)));
    } catch {}
  };
  const fetchFeaturedItems = async () => {
    try { const r = await axios.get(`${API}/featured-items`); setFeaturedItems(r.data); } catch {}
  };
  const fetchCommunityPassword = async () => {
    try {
      const r = await axios.get(`${API}/admin/settings/community-password`);
      setCommunityPassword(r.data.password);
      setEntryPasswordEnabled(r.data.enabled !== undefined ? r.data.enabled : true);
    } catch {}
  };
  const fetchContactEmail = async () => {
    try { const r = await axios.get(`${API}/settings/contact-email`); setContactEmail(r.data.email || ''); } catch {}
  };
  const fetchReports = async () => {
    try { const r = await axios.get(`${API}/admin/reports`); setReports(r.data); } catch {}
  };
  const fetchBugReports = async () => {
    try { const r = await axios.get(`${API}/admin/bug-reports`); setBugReports(r.data); } catch {}
  };
  const fetchVerificationRequests = async () => {
    try { const r = await axios.get(`${API}/admin/verification-requests`); setVerificationRequests(r.data); } catch {}
  };
  const fetchOfferExpiryDays = async () => {
    try { const r = await axios.get(`${API}/admin/settings/offer-expiry-days`); setOfferExpiryDays(r.data.days); } catch {}
  };

  // --- Handlers ---
  const handleSetRole = async (userId, role) => {
    try { await axios.post(`${API}/admin/set-role/${userId}?role=${role}`); toast.success(`Role nastavena: ${roleLabels[role]}`); fetchAll(); }
    catch { toast.error('Nepodařilo se změnit roli'); }
  };
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Opravdu smazat uživatele "${username}"? Tuto akci nelze vrátit zpět.`)) return;
    try { await axios.delete(`${API}/admin/users/${userId}`); toast.success(`Uživatel "${username}" byl smazán`); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se smazat uživatele'); }
  };
  const handleAdminSendReset = async (userId, email) => {
    try { await axios.post(`${API}/admin/users/${userId}/send-reset`); toast.success(`Odkaz pro reset hesla odeslán na ${email}`); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se odeslat email'); }
  };
  const handleDeleteNews = async (id) => {
    if (!window.confirm('Opravdu smazat tuto aktualitu?')) return;
    try { await axios.delete(`${API}/news/${id}`); toast.success('Aktualita smazána'); fetchAll(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleUpdateNews = async (id, data) => {
    try { await axios.put(`${API}/news/${id}`, data); toast.success('Aktualita aktualizována'); fetchAll(); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleDeleteSpecialist = async (id) => {
    if (!window.confirm('Opravdu smazat tohoto odborníka a všechny jeho recenze?')) return;
    try { await axios.delete(`${API}/specialists/${id}`); toast.success('Odborník smazán'); fetchAll(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleEditSpecialist = async (form) => {
    const { id, lat, lng, ...rest } = form;
    const payload = { ...rest, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null };
    try { await axios.put(`${API}/admin/specialists/${id}`, payload); toast.success('Odborník aktualizován'); fetchAll(); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleDeleteReview = async (id) => {
    if (!window.confirm('Smazat tuto recenzi?')) return;
    try { await axios.delete(`${API}/admin/reviews/${id}`); toast.success('Recenze smazána'); fetchReviews(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleUpdateReview = async (id, data) => {
    try { await axios.put(`${API}/admin/reviews/${id}`, data); toast.success('Recenze aktualizována'); fetchReviews(); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleDeleteService = async (id) => {
    if (!window.confirm('Smazat tuto nabídku/poptávku?')) return;
    try { await axios.delete(`${API}/services/${id}`); toast.success('Smazáno'); fetchServices(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleUpdateService = async (id, data) => {
    try { await axios.put(`${API}/services/${id}`, data); toast.success('Nabídka aktualizována'); fetchServices(); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleApproveSpecialist = async (id) => {
    try { await axios.put(`${API}/admin/specialists/${id}/approve`); toast.success('Odborník schválen!'); fetchPending(); fetchAll(); }
    catch { toast.error('Nepodařilo se schválit'); }
  };
  const handleRejectSpecialist = async (id) => {
    try { await axios.put(`${API}/admin/specialists/${id}/reject`); toast.success('Odborník zamítnut'); fetchPending(); }
    catch { toast.error('Nepodařilo se zamítnout'); }
  };
  const handleAddServiceType = async () => {
    if (!newServiceType.trim()) return;
    try { await axios.post(`${API}/service-types?name=${encodeURIComponent(newServiceType)}`); setNewServiceType(''); fetchContent(); toast.success('Přidáno'); }
    catch { toast.error('Nepodařilo se přidat'); }
  };
  const handleSaveServiceType = async (id) => {
    try { await axios.put(`${API}/service-types/${id}?name=${encodeURIComponent(editingServiceTypeName)}`); setEditingServiceType(null); fetchContent(); toast.success('Uloženo'); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleDeleteServiceType = async (id) => {
    try { await axios.delete(`${API}/service-types/${id}`); fetchContent(); toast.success('Smazáno'); } catch {}
  };
  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    try { await axios.post(`${API}/admin/locations?name=${encodeURIComponent(newLocation)}&country=${newLocationCountry}`); setNewLocation(''); setNewLocationCountry('CZ'); fetchContent(); toast.success('Přidáno'); }
    catch { toast.error('Nepodařilo se přidat lokalitu'); }
  };
  const handleSaveLocation = async (id) => {
    if (!editingLocationName.trim()) return;
    try { await axios.put(`${API}/admin/locations/${id}?name=${encodeURIComponent(editingLocationName)}&country=${editingLocationCountry}`); setEditingLocation(null); fetchContent(); toast.success('Lokalita upravena'); }
    catch { toast.error('Nepodařilo se upravit'); }
  };
  const handleDeleteLocation = async (id) => { try { await axios.delete(`${API}/admin/locations/${id}`); fetchContent(); } catch {} };
  const handleAddArticleCat = async () => {
    if (!newArticleCat.trim()) return;
    try { await axios.post(`${API}/admin/article-categories?name=${encodeURIComponent(newArticleCat)}`); setNewArticleCat(''); fetchContent(); toast.success('Přidáno'); } catch {}
  };
  const handleDeleteArticleCat = async (id) => { try { await axios.delete(`${API}/admin/article-categories/${id}`); fetchContent(); } catch {} };
  const handleUpdateArticleCatRoles = async (id, roles) => {
    try { await axios.put(`${API}/admin/article-categories/${id}/allowed-roles`, roles); fetchContent(); toast.success('Oprávnění uložena'); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se uložit oprávnění'); }
  };
  const handleAddNewsCat = async () => {
    if (!newNewsCat.trim()) return;
    try { await axios.post(`${API}/admin/news-categories?name=${encodeURIComponent(newNewsCat)}`); setNewNewsCat(''); fetchContent(); toast.success('Přidáno'); }
    catch { toast.error('Nepodařilo se přidat'); }
  };
  const handleSaveNewsCat = async (id) => {
    if (!editingNewsCatName.trim()) return;
    try { await axios.put(`${API}/admin/news-categories/${id}?name=${encodeURIComponent(editingNewsCatName)}`); setEditingNewsCat(null); fetchContent(); toast.success('Uloženo'); }
    catch { toast.error('Nepodařilo se uložit'); }
  };
  const handleDeleteNewsCat = async (id) => {
    try { await axios.delete(`${API}/admin/news-categories/${id}`); fetchContent(); toast.success('Smazáno'); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleUpdateNewsCatRoles = async (id, roles) => {
    try { await axios.put(`${API}/admin/news-categories/${id}/allowed-roles`, roles); fetchContent(); toast.success('Oprávnění uložena'); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se uložit oprávnění'); }
  };
  const handleAddSpecCat = async () => {
    if (!newSpecCat.trim()) return;
    try { await axios.post(`${API}/admin/specialist-categories?name=${encodeURIComponent(newSpecCat)}`); setNewSpecCat(''); fetchContent(); toast.success('Přidáno'); } catch {}
  };
  const handleDeleteSpecCat = async (id) => { try { await axios.delete(`${API}/admin/specialist-categories/${id}`); fetchContent(); } catch {} };
  const handleSaveSpecCat = async (id) => {
    if (!editingSpecCatName.trim()) return;
    try { await axios.put(`${API}/admin/specialist-categories/${id}`, { name: editingSpecCatName }); fetchContent(); setEditingSpecCat(null); toast.success('Kategorie upravena'); }
    catch { toast.error('Nepodařilo se upravit kategorii'); }
  };
  const handleSaveText = async (key) => {
    try { await axios.put(`${API}/admin/settings/texts`, { key, value: editingTextValue }); setTextSettings(prev => ({ ...prev, [key]: editingTextValue })); setEditingTextKey(null); toast.success('Text uložen'); }
    catch { toast.error('Nepodařilo se uložit text'); }
  };
  const handleSaveMarkerColors = async () => {
    try { await axios.put(`${API}/admin/settings/marker-colors`, draftColors); setMarkerColors(draftColors); setEditingColors(false); refreshAppSettings(); toast.success('Barvy markerů uloženy'); }
    catch { toast.error('Nepodařilo se uložit barvy'); }
  };
  const handleSaveSectionSettings = async () => {
    try { await axios.put(`${API}/admin/settings/sections`, draftSections); setSectionSettings(draftSections); setEditingSections(false); refreshAppSettings(); toast.success('Nastavení sekcí uloženo'); }
    catch { toast.error('Nepodařilo se uložit nastavení sekcí'); }
  };
  const handleToggleFeatured = async (type, itemId) => {
    const alreadyFeatured = featuredItems.some(f => f.type === type && f.data?.id === itemId);
    try {
      if (alreadyFeatured) { await axios.delete(`${API}/admin/featured-items/${type}/${itemId}`); toast.success('Odebráno z doporučených'); }
      else { await axios.post(`${API}/admin/featured-items?item_type=${type}&item_id=${itemId}`); toast.success('Přidáno do doporučených'); }
      fetchFeaturedItems();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Chyba'); }
  };
  const handleMoveFeatured = async (type, index, direction) => {
    const typeItems = featuredItems.filter(f => f.type === type).sort((a, b) => a.order - b.order);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= typeItems.length) return;
    const swapped = [...typeItems];
    [swapped[index], swapped[newIndex]] = [swapped[newIndex], swapped[index]];
    try { await axios.put(`${API}/admin/featured-items/reorder`, swapped.map(i => i.id)); fetchFeaturedItems(); }
    catch { toast.error('Chyba při přeřazení'); }
  };
  const handleUpdateCommunityPassword = async () => {
    if (!newCommunityPassword.trim()) return;
    try { await axios.put(`${API}/admin/settings/community-password`, { password: newCommunityPassword }); toast.success('Komunitní heslo bylo změněno!'); setCommunityPassword(newCommunityPassword); setNewCommunityPassword(''); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se změnit heslo'); }
  };
  const handleToggleEntryPassword = async (enabled) => {
    try { await axios.put(`${API}/admin/settings/entry-password-toggle`, { enabled }); setEntryPasswordEnabled(enabled); toast.success(enabled ? 'Ochrana vstupním heslem zapnuta' : 'Ochrana vstupním heslem vypnuta'); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se změnit nastavení'); }
  };
  const handleUpdateContactEmail = async () => {
    if (!newContactEmail.trim()) return;
    try { await axios.put(`${API}/admin/settings/contact-email`, { email: newContactEmail }); toast.success('Kontaktní email byl změněn!'); setContactEmail(newContactEmail); setNewContactEmail(''); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se změnit email'); }
  };
  const handleUpdateBugStatus = async (id, status) => {
    try { await axios.put(`${API}/admin/bug-reports/${id}/status`, { status }); setBugReports(prev => prev.map(r => r.id === id ? { ...r, status } : r)); toast.success('Stav aktualizován'); }
    catch { toast.error('Nepodařilo se aktualizovat stav'); }
  };
  const handleResolveReport = async (reportId) => {
    try { await axios.put(`${API}/admin/reports/${reportId}/resolve`); toast.success('Nahlášení vyřešeno'); fetchReports(); }
    catch { toast.error('Nepodařilo se vyřešit'); }
  };
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Opravdu smazat toto nahlášení?')) return;
    try { await axios.delete(`${API}/admin/reports/${reportId}`); setReports(prev => prev.filter(r => r.id !== reportId)); toast.success('Nahlášení smazáno'); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleDeleteBugReport = async (reportId) => {
    if (!window.confirm('Opravdu smazat tento bug report?')) return;
    try { await axios.delete(`${API}/admin/bug-reports/${reportId}`); setBugReports(prev => prev.filter(r => r.id !== reportId)); toast.success('Bug report smazán'); }
    catch { toast.error('Nepodařilo se smazat'); }
  };
  const handleUpdateVerificationStatus = async (reqId, status, role) => {
    try {
      const payload = { status };
      if (role) payload.role = role;
      await axios.put(`${API}/admin/verification-requests/${reqId}/status`, payload);
      toast.success(status === 'approved' ? 'Žádost schválena – role přiřazena' : 'Žádost zamítnuta – role odebrána');
      fetchVerificationRequests();
      fetchAll(); // refresh users list (role may have changed)
    } catch { toast.error('Nepodařilo se aktualizovat stav žádosti'); }
  };
  const handleSetSpecializationLabel = async (userId, label) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/specialization-label`, { label });
      toast.success('Specializační štítek uložen');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se uložit štítek'); }
  };
  const handleUpdateOfferExpiryDays = async (days) => {
    try { await axios.put(`${API}/admin/settings/offer-expiry-days?days=${days}`); setOfferExpiryDays(days); toast.success(`Platnost nabídek nastavena na ${days} dní`); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se uložit nastavení'); }
  };
  const handleReactivateService = async (id) => {
    try { await axios.put(`${API}/admin/services/${id}/reactivate`); toast.success('Nabídka byla obnovena!'); fetchServices(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se obnovit nabídku'); }
  };
  const handleCreateNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) { toast.error('Vyplňte název a obsah.'); return; }
    setNewsLoading(true);
    try { await axios.post(`${API}/news`, newsForm); toast.success('Aktualita přidána!'); setNewsForm({ title: '', content: '', category: 'local', image_url: '' }); setShowNewsForm(false); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se přidat aktualitu'); }
    finally { setNewsLoading(false); }
  };
  const handleCreateSpecialist = async (e) => {
    e.preventDefault();
    if (!specForm.name || !specForm.address || !specForm.city) { toast.error('Vyplňte jméno, adresu a město.'); return; }
    setSpecLoading(true);
    try {
      const payload = { ...specForm, lat: specForm.lat ? parseFloat(specForm.lat) : null, lng: specForm.lng ? parseFloat(specForm.lng) : null };
      await axios.post(`${API}/specialists`, payload);
      toast.success('Odborník přidán!');
      setSpecForm({ name: '', specialty: 'Psychologie, psychiatrie a sexuologie', description: '', subcategory: '', address: '', city: '', region: '', country: 'CZ', phone: '', email: '', website: '', lat: '', lng: '', assigned_locations: [] });
      setShowSpecialistForm(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se přidat odborníka'); }
    finally { setSpecLoading(false); }
  };

  return {
    // Data
    users, news, specialists, locations, reviews, services,
    pendingSpecialists, serviceTypes, articleCats, specCats, newsCatsApi,
    loading, userSearch, setUserSearch,
    // News form
    showNewsForm, setShowNewsForm, newsForm, setNewsForm, newsLoading,
    // Spec form
    showSpecialistForm, setShowSpecialistForm, specForm, setSpecForm, specLoading,
    // Content state
    newServiceType, setNewServiceType,
    editingServiceType, setEditingServiceType,
    editingServiceTypeName, setEditingServiceTypeName,
    newLocation, setNewLocation, newLocationCountry, setNewLocationCountry,
    editingLocation, setEditingLocation, editingLocationName, setEditingLocationName,
    editingLocationCountry, setEditingLocationCountry,
    newArticleCat, setNewArticleCat, newSpecCat, setNewSpecCat,
    editingSpecCat, setEditingSpecCat, editingSpecCatName, setEditingSpecCatName,
    newNewsCat, setNewNewsCat, editingNewsCat, setEditingNewsCat,
    editingNewsCatName, setEditingNewsCatName,
    // Settings state
    communityPassword, newCommunityPassword, setNewCommunityPassword,
    showCommunityPw, setShowCommunityPw, entryPasswordEnabled,
    contactEmail, newContactEmail, setNewContactEmail, offerExpiryDays,
    // Reports
    reports, bugReports, expandedBugReport, setExpandedBugReport,
    // Text settings
    textSettings, editingTextKey, setEditingTextKey, editingTextValue, setEditingTextValue,
    // Marker colors & sections
    markerColors, editingColors, setEditingColors, draftColors, setDraftColors,
    sectionSettings, editingSections, setEditingSections, draftSections, setDraftSections,
    // Featured items
    featuredItems, selectedService, setSelectedService,
    // Verification requests
    verificationRequests, fetchVerificationRequests,
    handleUpdateVerificationStatus, handleSetSpecializationLabel,
    // Fetchers (for tab onClick triggers)
    fetchPending, fetchReviews, fetchServices,
    fetchContent, fetchMarkerColors, fetchSectionSettings, fetchFeaturedItems,
    fetchCommunityPassword, fetchContactEmail, fetchReports, fetchBugReports, fetchOfferExpiryDays,
    // Handlers
    handleSetRole, handleDeleteUser, handleAdminSendReset,
    handleDeleteNews, handleUpdateNews, handleDeleteSpecialist, handleEditSpecialist, handleDeleteReview, handleUpdateReview, handleDeleteService, handleUpdateService,
    handleApproveSpecialist, handleRejectSpecialist,
    handleAddServiceType, handleSaveServiceType, handleDeleteServiceType,
    handleAddLocation, handleSaveLocation, handleDeleteLocation,
    handleAddArticleCat, handleDeleteArticleCat, handleUpdateArticleCatRoles,
    handleAddNewsCat, handleSaveNewsCat, handleDeleteNewsCat, handleUpdateNewsCatRoles,
    handleAddSpecCat, handleDeleteSpecCat, handleSaveSpecCat,
    handleSaveText, handleSaveMarkerColors, handleSaveSectionSettings,
    handleToggleFeatured, handleMoveFeatured,
    handleUpdateCommunityPassword, handleToggleEntryPassword, handleUpdateContactEmail,
    handleUpdateBugStatus, handleResolveReport, handleDeleteReport, handleDeleteBugReport, handleUpdateOfferExpiryDays,
    handleReactivateService, handleCreateNews, handleCreateSpecialist,
  };
}
