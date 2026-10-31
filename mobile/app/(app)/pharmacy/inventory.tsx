import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { medicineAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

const CATEGORIES = ['Analgesic / Antipyretic', 'Antibiotic', 'Antihistamine', 'Antacid', 'Antidiabetic', 'Cardiovascular', 'Vitamins & Minerals', 'Other'];

export default function PharmacyInventoryScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [medicines, setMedicines] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'available' | 'low_stock' | 'out_of_stock'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form fields
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit stock modal
  const [editingMed, setEditingMed] = useState(null);
  const [editStockVal, setEditStockVal] = useState('');
  const [editPriceVal, setEditPriceVal] = useState('');

  useEffect(() => {
    loadLocalInventory();
    if (isOnline) {
      fetchServerInventory();
    }
  }, []);

  const loadLocalInventory = async () => {
    try {
      const rows = await dbAll('SELECT * FROM medicines ORDER BY name ASC');
      if (rows && rows.length > 0) {
        setMedicines(rows);
      }
    } catch (e) {
      console.log('Error reading local medicines:', e.message);
    }
  };

  const fetchServerInventory = async () => {
    try {
      const pharmaId = user?._id || user?.id;
      const res = await medicineAPI.list({ pharmacyId: pharmaId });
      const meds = res.data?.medicines || res.data || [];
      if (meds.length > 0) {
        setMedicines(meds);
      }
    } catch (e) {
      console.log('Error loading server inventory:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadInventory = async () => {
    await loadLocalInventory();
    if (isOnline) {
      await fetchServerInventory();
    }
    setRefreshing(false);
  };

  const handleAddMedicine = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter medicine brand name.');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Required', 'Please enter a valid retail price (₹).');
      return;
    }
    if (!stock.trim() || isNaN(Number(stock))) {
      Alert.alert('Required', 'Please enter current stock quantity.');
      return;
    }

    setSaving(true);
    const localId = 'MED_' + Date.now();
    const pharmaId = user?._id || user?.id || 'LOCAL_PHARMA';
    const stockNum = parseInt(stock, 10);
    const minStockNum = parseInt(minStock, 10) || 5;

    let computedStatus = 'available';
    if (stockNum === 0) computedStatus = 'out_of_stock';
    else if (stockNum <= minStockNum) computedStatus = 'low_stock';

    const payload = {
      id: localId,
      pharmacyId: pharmaId,
      name: name.trim(),
      genericName: genericName.trim(),
      category,
      price: parseFloat(price),
      stock: stockNum,
      minStock: minStockNum,
      expiryDate,
      description: description.trim(),
      status: computedStatus,
    };

    try {
      await dbRun(
        `INSERT INTO medicines 
          (id, pharmacy_id, name, generic_name, category, price, stock, min_stock, expiry_date, description, status, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          localId, pharmaId, payload.name, payload.genericName, payload.category,
          payload.price, payload.stock, payload.minStock, payload.expiryDate,
          payload.description, payload.status, isOnline ? 'synced' : 'pending',
        ]
      );

      if (isOnline) {
        try {
          await medicineAPI.create(payload);
        } catch (serverErr) {
          await enqueue(pharmaId, localId, 'CREATE', 'medicines', payload);
        }
      } else {
        await enqueue(pharmaId, localId, 'CREATE', 'medicines', payload);
      }

      setShowAddModal(false);
      setName('');
      setGenericName('');
      setPrice('');
      setStock('');
      setDescription('');
      Alert.alert('Medicine Added', 'Inventory item created and stock ledger updated.');
      loadInventory();
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!editingMed) return;
    const medId = editingMed._id || editingMed.id;
    const newStock = parseInt(editStockVal, 10);
    const newPrice = parseFloat(editPriceVal);

    if (isNaN(newStock) || isNaN(newPrice)) {
      Alert.alert('Required', 'Please enter valid stock and price values.');
      return;
    }

    const minStockNum = editingMed.minStock || editingMed.min_stock || 5;
    let computedStatus = 'available';
    if (newStock === 0) computedStatus = 'out_of_stock';
    else if (newStock <= minStockNum) computedStatus = 'low_stock';

    try {
      const payload = { stock: newStock, price: newPrice, status: computedStatus };
      if (isOnline) {
        await medicineAPI.update(medId, payload);
      } else {
        await dbRun('UPDATE medicines SET stock = ?, price = ?, status = ? WHERE id = ?', [newStock, newPrice, computedStatus, medId]);
        await enqueue(user?._id || user?.id, medId, 'UPDATE', 'medicines', payload);
      }

      setEditingMed(null);
      Alert.alert('Updated', 'Stock and price successfully changed.');
      loadInventory();
    } catch (e) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const filtered = medicines.filter(m => {
    const matchesSearch =
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.genericName && m.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;

    const st = m.status || (m.stock === 0 ? 'out_of_stock' : (m.stock <= (m.minStock || 5) ? 'low_stock' : 'available'));
    return st === filterStatus;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Drug Inventory"
        subtitle="Manage pharmacy pharmaceuticals & price list"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add Drug</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by drug name or generic salt..."
          placeholderTextColor={Colors.secondaryText}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Filter */}
      <View style={styles.filterRow}>
        {['all', 'available', 'low_stock', 'out_of_stock'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && styles.filterChipTextActive]}>
              {st.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadInventory(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState message="Loading dispensary stock..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💊"
            title="No Medicines Match"
            subtitle="Add pharmaceuticals to your digital inventory to make them discoverable to patients."
            action={() => setShowAddModal(true)}
            actionLabel="+ Add First Medicine"
          />
        ) : (
          filtered.map((med, idx) => {
            const stockQty = med.stock ?? 0;
            const minStockQty = med.minStock || med.min_stock || 5;
            let status = med.status;
            if (!status) {
              if (stockQty === 0) status = 'out_of_stock';
              else if (stockQty <= minStockQty) status = 'low_stock';
              else status = 'available';
            }

            return (
              <Card key={med._id || med.id || idx} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.genericSub}>
                      {med.genericName || med.generic_name || 'Generic Formulation'} • {med.category || 'General'}
                    </Text>
                  </View>
                  <Badge status={status} />
                </View>

                <View style={styles.numbersRow}>
                  <Text style={styles.priceTag}>₹{med.price?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.stockTag}>
                    Stock: <Text style={{ fontWeight: '800', color: Colors.darkText }}>{stockQty} units</Text>
                  </Text>
                  <Text style={styles.expiryTag}>
                    Exp: {med.expiryDate || med.expiry_date || '2027'}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="✏️ Update Stock / Price"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditingMed(med);
                      setEditStockVal(String(med.stock ?? 0));
                      setEditPriceVal(String(med.price ?? 0));
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Medicine Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medicine to Inventory</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Brand / Commercial Name *"
                placeholder="e.g. Dolo 650, Augmentin 625"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Generic Salt Composition"
                placeholder="e.g. Paracetamol, Amoxicillin + Clavulanate"
                value={genericName}
                onChangeText={setGenericName}
              />

              <Text style={styles.label}>Therapeutic Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Input
                    label="Retail Price (₹) *"
                    placeholder="e.g. 25.50"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Stock Quantity *"
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Input
                    label="Low Stock Alert Threshold"
                    placeholder="5"
                    keyboardType="numeric"
                    value={minStock}
                    onChangeText={setMinStock}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Batch Expiry (YYYY-MM-DD)"
                    placeholder="2027-12-31"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                  />
                </View>
              </View>

              <Button
                title={saving ? 'Saving...' : 'Add Medicine to Dispensary'}
                variant="primary"
                size="lg"
                loading={saving}
                onPress={handleAddMedicine}
                style={{ marginTop: Spacing.md, marginBottom: Spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal visible={!!editingMed} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Stock & Price</Text>
                <Text style={styles.genericSub}>{editingMed?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingMed(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Current Stock Quantity"
              value={editStockVal}
              onChangeText={setEditStockVal}
              keyboardType="numeric"
            />
            <Input
              label="Price (₹)"
              value={editPriceVal}
              onChangeText={setEditPriceVal}
              keyboardType="numeric"
            />

            <Button
              title="Save Updates"
              variant="primary"
              size="md"
              onPress={handleUpdateStock}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.darkText },
  clearBtn: { fontSize: 16, color: Colors.secondaryText, padding: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.base, gap: 6, marginVertical: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 10, fontWeight: '800', color: Colors.secondaryText },
  filterChipTextActive: { color: Colors.white },
  scroll: { padding: Spacing.base },
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  medName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  genericSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  numbersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.xs },
  priceTag: { fontSize: Fonts.sizes.md, fontWeight: '900', color: Colors.primaryDark },
  stockTag: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  expiryTag: { fontSize: 10, color: Colors.secondaryText },
  actionRow: { marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  label: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  catScroll: { flexDirection: 'row', marginBottom: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginRight: Spacing.xs },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  catChipTextActive: { color: Colors.white, fontWeight: '800' },
  row: { flexDirection: 'row' },
});

