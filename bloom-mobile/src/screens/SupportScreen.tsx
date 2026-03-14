import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { OutlineIcon } from '../components/OutlineIcon';
import axios from 'axios';
import { API } from '../config/api';
import { SECTION_HEADING } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { LocationDropdown } from '../components/LocationDropdown';
import { ServiceTypeDropdown } from '../components/ServiceTypeDropdown';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface Service {
  id: string;
  offer?: string;
  need?: string;
  description?: string;
  location?: string;
  service_type?: string;
  post_type?: string;
  user_id?: string;
  username?: string;
}

export default function SupportScreen({ navigation }: any) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [serviceTypes, setServiceTypes] = useState<{ id: string; name: string }[]>([]);
  const [showMyServices, setShowMyServices] = useState(false);
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'offer' | 'request'>('all');
  const [countryFilter, setCountryFilter] = useState<'CZ' | 'WORLD'>('CZ');
  const [locationFilter, setLocationFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const { allLocations, refetch: refetchLocations } = useLocations({ includeNone: false });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Create form
  const [postType, setPostType] = useState<'offer' | 'request'>('offer');
  const [offer, setOffer] = useState('');
  const [need, setNeed] = useState('');
  const [description, setDescription] = useState('');
  const [formCountry, setFormCountry] = useState<'CZ' | 'WORLD'>('CZ');
  const [formLocation, setFormLocation] = useState('');
  const [serviceType, setServiceType] = useState('other');

  const fetchServices = async () => {
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (postTypeFilter !== 'all') params.post_type = postTypeFilter;
      if (countryFilter) params.country = countryFilter;
      if (locationFilter) params.location = locationFilter;
      if (serviceTypeFilter) params.service_type = serviceTypeFilter;
      const r = await axios.get(`${API}/services`, { params });
      setServices(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchMyServices = async () => {
    if (!user) return;
    try {
      const r = await axios.get(`${API}/services/my`);
      setMyServices(r.data);
    } catch {}
  };

  const fetchServiceTypes = async () => {
    try {
      const r = await axios.get(`${API}/service-types`);
      setServiceTypes(r.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refetchLocations();
    }, [refetchLocations])
  );

  useEffect(() => {
    if (user) fetchMyServices();
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchServices();
  }, [postTypeFilter, countryFilter, locationFilter, serviceTypeFilter, debouncedSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    refetchLocations();
    await Promise.all([fetchServices(), fetchMyServices()]);
    setRefreshing(false);
  };


  const handleCreate = async () => {
    const desc = description.trim();
    const off = postType === 'offer' ? (offer.trim() || 'Nabídka') : '';
    const ned = postType === 'request' ? (need.trim() || 'Poptávka') : '';
    if (!desc) {
      Alert.alert('Chyba', 'Vyplňte popis.');
      return;
    }
    if (postType === 'offer' && !offer.trim()) {
      Alert.alert('Chyba', 'Vyplňte, co nabízíte.');
      return;
    }
    if (postType === 'request' && !need.trim()) {
      Alert.alert('Chyba', 'Vyplňte, co hledáte.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/services`, {
        offer: off || '',
        need: ned || '',
        description: desc,
        location: formLocation || '',
        service_type: serviceType || 'other',
        post_type: postType,
      });
      setCreateModalVisible(false);
      setOffer('');
      setNeed('');
      setDescription('');
      setFormLocation('');
      setFormCountry('CZ');
      setServiceType('other');
      setPostType('offer');
      await Promise.all([fetchServices(), fetchMyServices()]);
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se vytvořit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!selectedService || !replyMessage.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/messages`, {
        to_user_id: selectedService.user_id,
        content: replyMessage.trim(),
      });
      setReplyModalVisible(false);
      setSelectedService(null);
      setReplyMessage('');
      (navigation.getParent?.() as any)?.navigate?.('Messages');
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Smazat', 'Opravdu smazat tento příspěvek?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API}/services/${id}`);
            await Promise.all([fetchServices(), fetchMyServices()]);
            setDetailModalVisible(false);
            setSelectedService(null);
          } catch {}
        },
      },
    ]);
  };

  const openDetail = (s: Service) => {
    setSelectedService(s);
    setDetailModalVisible(true);
  };

  const openReply = () => {
    setDetailModalVisible(false);
    setReplyMessage(selectedService ? `Dobrý den! Zaujala mě vaše ${selectedService.post_type === 'offer' ? 'nabídka' : 'poptávka'} "${(selectedService.offer || selectedService.need || '').slice(0, 40)}"... ` : '');
    setReplyModalVisible(true);
  };

  const baseList = showMyServices ? myServices : services;
  const isOwner = (s: Service) => user && s.user_id === user.id;
  const markerColors = useMarkerColors();

  const [countryRegionModalVisible, setCountryRegionModalVisible] = useState(false);
  const countryRegionLabel = locationFilter
    ? `${countryFilter === 'CZ' ? 'Česko' : 'Svět'} · ${locationFilter}`
    : countryFilter === 'CZ' ? 'Česko' : 'Svět';
  const czRegions = allLocations.filter((l) => l.country === 'CZ');
  const worldRegions = allLocations.filter((l) => l.country === 'WORLD');
  const categoryOptions = [{ id: '', name: 'Všechny kategorie' }, ...serviceTypes];
  const categoryLabel = serviceTypeFilter
    ? (serviceTypes.find((s) => s.id === serviceTypeFilter)?.name || 'Kategorie')
    : 'Kategorie';
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.titleRow}>
        <View style={[styles.titleDot, { backgroundColor: markerColors?.support || '#8A7CFF' }]} />
        <Text style={styles.title}>Vzájemná podpora</Text>
      </View>
      <Text style={styles.subtitle}>Nabídky a poptávky pomoci v komunitě</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Hledat..."
        placeholderTextColor={COLORS.sub}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow1}>
        <TouchableOpacity
          style={[styles.tab, (!showMyServices && postTypeFilter === 'all') && styles.tabActive]}
          onPress={() => { setShowMyServices(false); setPostTypeFilter('all'); }}
        >
          <Text style={[styles.tabText, (!showMyServices && postTypeFilter === 'all') && styles.tabTextActive]}>Vše</Text>
        </TouchableOpacity>
        {user && (
          <TouchableOpacity
            style={[styles.tab, showMyServices && styles.tabActive]}
            onPress={() => setShowMyServices(true)}
          >
            <Text style={[styles.tabText, showMyServices && styles.tabTextActive]}>Moje ({myServices.length})</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, (!showMyServices && postTypeFilter === 'offer') && styles.tabActive]}
          onPress={() => { setShowMyServices(false); setPostTypeFilter('offer'); }}
        >
          <Text style={[styles.tabText, (!showMyServices && postTypeFilter === 'offer') && styles.tabTextActive]}>Nabídky</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, (!showMyServices && postTypeFilter === 'request') && styles.tabActive]}
          onPress={() => { setShowMyServices(false); setPostTypeFilter('request'); }}
        >
          <Text style={[styles.tabText, (!showMyServices && postTypeFilter === 'request') && styles.tabTextActive]}>Poptávky</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow2}>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setCountryRegionModalVisible(true)}>
          <Text style={styles.dropdownText} numberOfLines={1}>{countryRegionLabel}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setCategoryModalVisible(true)}>
          <Text style={styles.dropdownText} numberOfLines={1}>{categoryLabel}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={countryRegionModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCountryRegionModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Lokalita</Text>
            <ScrollView style={styles.dropdownList}>
              <TouchableOpacity
                style={[styles.dropdownOption, !locationFilter && countryFilter === 'CZ' && styles.dropdownOptionActive]}
                onPress={() => { setCountryFilter('CZ'); setLocationFilter(''); setCountryRegionModalVisible(false); }}
              >
                <Text style={[styles.dropdownOptionText, !locationFilter && countryFilter === 'CZ' && styles.dropdownOptionTextActive]}>Česko</Text>
              </TouchableOpacity>
              {czRegions.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.dropdownOption, locationFilter === loc.name && styles.dropdownOptionActive]}
                  onPress={() => { setCountryFilter('CZ'); setLocationFilter(loc.name); setCountryRegionModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, locationFilter === loc.name && styles.dropdownOptionTextActive]}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.dropdownOption, !locationFilter && countryFilter === 'WORLD' && styles.dropdownOptionActive]}
                onPress={() => { setCountryFilter('WORLD'); setLocationFilter(''); setCountryRegionModalVisible(false); }}
              >
                <Text style={[styles.dropdownOptionText, !locationFilter && countryFilter === 'WORLD' && styles.dropdownOptionTextActive]}>Svět</Text>
              </TouchableOpacity>
              {worldRegions.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.dropdownOption, locationFilter === loc.name && styles.dropdownOptionActive]}
                  onPress={() => { setCountryFilter('WORLD'); setLocationFilter(loc.name); setCountryRegionModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, locationFilter === loc.name && styles.dropdownOptionTextActive]}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCountryRegionModalVisible(false)}>
              <Text style={styles.closeBtnText}>Zavřít</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Kategorie</Text>
            <ScrollView style={styles.dropdownList}>
              {categoryOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id || 'all'}
                  style={[styles.dropdownOption, serviceTypeFilter === opt.id && styles.dropdownOptionActive]}
                  onPress={() => { setServiceTypeFilter(opt.id); setCategoryModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, serviceTypeFilter === opt.id && styles.dropdownOptionTextActive]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.closeBtnText}>Zavřít</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? (
        <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
      ) : (
        baseList.map((s) => (
          <TouchableOpacity key={s.id} style={styles.card} onPress={() => openDetail(s)} activeOpacity={0.8}>
            <Text style={styles.cardMeta}>
              {s.post_type === 'offer' ? 'Nabízím' : 'Poptávám'}{s.location ? ` · ${s.location}` : ''}
            </Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{s.offer || s.need || '—'}</Text>
            {s.description ? <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text> : null}
            <Text style={styles.cardUser}>@{s.username || 'uživatel'}</Text>
          </TouchableOpacity>
        ))
      )}

      {!loading && baseList.length === 0 && (
        <Text style={styles.emptyText}>
          {showMyServices ? 'Nemáte žádné příspěvky. Vytvořte nabídku nebo poptávku.' : 'Žádné příspěvky nenalezeny.'}
        </Text>
      )}

      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      <Modal visible={createModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nová nabídka / poptávka</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, postType === 'offer' && styles.typeBtnActive]}
                  onPress={() => setPostType('offer')}
                >
                  <Text style={[styles.typeBtnText, postType === 'offer' && styles.typeBtnTextActive]}>Nabízím</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, postType === 'request' && styles.typeBtnActive]}
                  onPress={() => setPostType('request')}
                >
                  <Text style={[styles.typeBtnText, postType === 'request' && styles.typeBtnTextActive]}>Hledám</Text>
                </TouchableOpacity>
              </View>
              {serviceTypes.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <ServiceTypeDropdown
                    options={serviceTypes}
                    value={serviceType}
                    onSelect={setServiceType}
                    label="Druh služby"
                    placeholder="Vyberte druh služby"
                  />
                </View>
              )}
              {postType === 'offer' ? (
                <TextInput
                  style={styles.input}
                  placeholder="Co nabízíte? (např. vaření, účesy...)"
                  placeholderTextColor={COLORS.sub}
                  value={offer}
                  onChangeText={setOffer}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Co hledáte? (např. masáže, fotografie...)"
                  placeholderTextColor={COLORS.sub}
                  value={need}
                  onChangeText={setNeed}
                />
              )}
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Podrobnější popis *"
                placeholderTextColor={COLORS.sub}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.inputLabel}>Lokalita</Text>
              <View style={[styles.toggle, { marginBottom: 12 }]}>
                {(['CZ', 'WORLD'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.toggleBtn, styles.toggleBtnFlex, formCountry === c && styles.toggleBtnActive]}
                    onPress={() => { setFormCountry(c); setFormLocation(''); }}
                  >
                    <Text style={[styles.toggleText, formCountry === c && styles.toggleTextActive]}>{c === 'CZ' ? 'Česko' : 'Svět'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {allLocations.filter((l) => l.country === formCountry).length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <LocationDropdown
                    country={formCountry}
                    region={formLocation}
                    onRegionChange={setFormLocation}
                    locations={allLocations}
                    label="Lokalita"
                    firstOptionLabel="Nechci uvádět"
                  />
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Vytvořit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedService && (
              <>
                <Text style={styles.modalTitle}>{selectedService.post_type === 'offer' ? 'Nabídka' : 'Poptávka'}</Text>
                <ScrollView style={styles.detailScroll}>
                  <Text style={styles.detailOffer}>{selectedService.offer || selectedService.need || '—'}</Text>
                  {selectedService.description ? (
                    <Text style={styles.detailDesc}>{selectedService.description}</Text>
                  ) : null}
                  {selectedService.location ? (
                    <View style={styles.detailMetaRow}>
                      <OutlineIcon name="map-pin" size={16} color={COLORS.sub} />
                      <Text style={styles.detailMeta}>{selectedService.location}</Text>
                    </View>
                  ) : null}
                  {selectedService.user_id ? (
                    <TouchableOpacity onPress={() => { setDetailModalVisible(false); setSelectedService(null); navigation.navigate('UserProfile', { userId: selectedService.user_id }); }}>
                      <Text style={styles.detailUser}>@{selectedService.username}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.detailUser}>@{selectedService.username}</Text>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  {isOwner(selectedService) ? (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(selectedService.id)}
                    >
                      <Text style={styles.deleteBtnText}>Smazat</Text>
                    </TouchableOpacity>
                  ) : user ? (
                    <TouchableOpacity style={styles.replyBtn} onPress={openReply}>
                      <Text style={styles.replyBtnText}>Odpovědět</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setDetailModalVisible(false); setSelectedService(null); }}>
                    <Text style={styles.cancelBtnText}>Zavřít</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Odpovědět na příspěvek</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Napište zprávu..."
              placeholderTextColor={COLORS.sub}
              value={replyMessage}
              onChangeText={setReplyMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReplyModalVisible(false); setReplyMessage(''); }}>
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || !replyMessage.trim()) && styles.submitBtnDisabled]}
                onPress={handleReply}
                disabled={submitting || !replyMessage.trim()}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Odeslat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  titleDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.9 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 4, marginBottom: 20 },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginBottom: 20,
  },
  filterRow1: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filterRow2: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: { backgroundColor: `${COLORS.violet}20` },
  tabText: { fontSize: 14, color: COLORS.sub },
  tabTextActive: { color: COLORS.violet, fontWeight: '600' },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownText: { fontSize: 14, color: COLORS.text, flex: 1 },
  chevron: { fontSize: 10, color: COLORS.sub, marginLeft: 4 },
  dropdownList: { maxHeight: 280 },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownOptionActive: { backgroundColor: `${COLORS.violet}12` },
  dropdownOptionText: { fontSize: 15, color: COLORS.text },
  dropdownOptionTextActive: { color: COLORS.violet, fontWeight: '600' },
  closeBtn: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  closeBtnText: { fontSize: 15, color: COLORS.violet, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMeta: { fontSize: 12, color: COLORS.sub, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.sub, marginTop: 4, lineHeight: 18 },
  cardUser: { fontSize: 12, color: COLORS.sub, marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.violet,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { fontSize: 28, color: COLORS.white, fontWeight: '300', lineHeight: 32 },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  typeBtnText: { fontSize: 14, color: COLORS.text },
  typeBtnTextActive: { color: COLORS.white },
  inputLabel: { fontSize: 12, color: COLORS.sub, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: COLORS.sub },
  submitBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
  detailScroll: { maxHeight: 200 },
  detailOffer: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  detailDesc: { fontSize: 14, color: COLORS.sub, marginBottom: 8 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailMeta: { fontSize: 13, color: COLORS.sub },
  detailUser: { fontSize: 13, color: COLORS.violet, fontWeight: '500' },
  replyBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 12, borderRadius: 10, alignItems: 'center' },
  replyBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', padding: 12, borderRadius: 10, alignItems: 'center' },
  deleteBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
