import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { formatTimestamp, getReadingHistory } from '@/services/api';
import { analyticsData, historyRecords as mockHistoryRecords } from '@/services/mockData';
import { Reading } from '@/services/types';
import { useFloatingTabBarClearance } from '@/components/floating-tab-bar';
import { Typography } from '@/constants/typography';

type Period = 'daily' | 'weekly' | 'monthly';

const C = {
  background: '#F5F7F2',
  surface: '#FFFFFF',
  green: '#123D32',
  greenLight: '#E7F0E9',
  lime: '#B7E36A',
  text: '#26352F',
  muted: '#87918A',
  border: '#E9EDE7',
  orange: '#E9A34B',
  red: '#D9534F',
};

const periods: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const TARIFF_RATE = 8.63; // ৳ per kWh

export default function HistoryScreen() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    const result = await getReadingHistory({ limit: 50 });
    if (result.error) {
      setError(result.error);
    } else {
      setReadings(result.data);
      setError(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      await fetchHistory();
      if (isMounted) setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  // Demo analytics fallback or baseline trend
  const baseData = analyticsData[period];

  // Prepare real aggregates when real database readings exist
  const hasRealData = !demoMode && readings.length > 0;
  const realTotalEnergy = readings.reduce((acc, r) => acc + (r.energy || 0), 0);
  const realCost = realTotalEnergy * TARIFF_RATE;
  const realPeakPower = readings.length > 0 ? Math.max(...readings.map((r) => r.power || 0)) : 0;
  const realAvgPower =
    readings.length > 0
      ? readings.reduce((acc, r) => acc + (r.power || 0), 0) / readings.length
      : 0;

  const displayTotal = hasRealData ? realTotalEnergy.toFixed(2) : baseData.total.toFixed(2);
  const displayCost = hasRealData ? realCost.toFixed(2) : baseData.cost.toFixed(2);
  const displayPeak = hasRealData ? `${realPeakPower.toFixed(1)} W` : `${baseData.peak.toFixed(2)} kWh`;
  const displayAvg = hasRealData ? `${realAvgPower.toFixed(1)} W` : `${baseData.average.toFixed(2)} kWh`;

  const maxValue = Math.max(...baseData.chart.map((item) => item.value));

  const periodDescription = {
    daily: 'Hourly consumption today',
    weekly: 'Daily consumption this week',
    monthly: 'Weekly consumption this month',
  };

  const bottomClearance = useFloatingTabBarClearance();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.green]}
            tintColor={C.green}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>History & Analytics</Text>
            <Text style={styles.subtitle}>
              {demoMode
                ? "Demonstration mode"
                : "MongoDB Atlas energy records"}
            </Text>
          </View>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {demoMode ? "DEMO" : "TEST DATA"}
            </Text>
          </View>
        </View>

        {/* Error notification banner if API fails */}
        {error && !demoMode && (
          <View style={styles.errorBanner}>
            <View style={styles.errorTextCol}>
              <Text style={styles.errorTitle}>Cannot load history records</Text>
              <Text style={styles.errorDescription}>{error}</Text>
            </View>
            <View style={styles.errorActions}>
              <Pressable onPress={fetchHistory} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
              <Pressable
                onPress={() => setDemoMode(true)}
                style={styles.demoButton}
              >
                <Text style={styles.demoButtonText}>Demo Mode</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Demo banner */}
        {demoMode && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              Displaying local demonstration history.
            </Text>
            <Pressable
              onPress={() => {
                setDemoMode(false);
                fetchHistory();
              }}
              style={styles.exitDemoButton}
            >
              <Text style={styles.exitDemoButtonText}>Exit Demo</Text>
            </Pressable>
          </View>
        )}

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {periods.map((item) => {
            const selected = period === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setPeriod(item.value)}
                style={[
                  styles.periodButton,
                  selected && styles.selectedPeriod,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    selected && styles.selectedPeriodText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Main consumption card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>TOTAL ENERGY CONSUMPTION</Text>

          <View style={styles.mainValueRow}>
            <Text style={styles.mainValue}>{displayTotal}</Text>
            <Text style={styles.mainUnit}>kWh</Text>
          </View>

          <Text style={styles.mainDescription}>
            {hasRealData
              ? "Accumulated test database consumption"
              : periodDescription[period]}
          </Text>

          <View style={styles.mainDivider} />

          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Estimated electricity cost</Text>
              <Text style={styles.costValue}>৳{displayCost}</Text>
            </View>

            <View style={styles.costIcon}>
              <Text style={styles.costIconText}>৳</Text>
            </View>
          </View>
        </View>

        {/* Chart card (Preserving visual trend chart for future time-series data) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Consumption trend</Text>
              <Text style={styles.chartSubtitle}>
                {periodDescription[period]} (Sample profile)
              </Text>
            </View>
            <Text style={styles.chartUnit}>kWh</Text>
          </View>

          <View style={styles.chart}>
            {baseData.chart.map((item) => {
              const height = Math.max((item.value / maxValue) * 125, 5);
              const isHighest = item.value === maxValue;

              return (
                <View key={item.label} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.value.toFixed(1)}</Text>

                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height },
                        isHighest && styles.highestBar,
                      ]}
                    />
                  </View>

                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Statistics */}
        <Text style={styles.sectionTitle}>Consumption insights</Text>

        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>◷</Text>
            <Text style={styles.insightLabel}>Average load</Text>
            <Text style={styles.insightValue}>{displayAvg}</Text>
            <Text style={styles.insightHint}>
              {hasRealData ? "Recorded readings" : "Sample interval"}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>↗</Text>
            <Text style={styles.insightLabel}>Peak demand</Text>
            <Text style={styles.insightValue}>{displayPeak}</Text>
            <Text style={styles.insightHint}>
              {hasRealData ? "Highest test peak" : "Highest sample"}
            </Text>
          </View>
        </View>

        {/* Historical records */}
        <View style={styles.recordsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Historical records</Text>
            <Text style={styles.sectionSubtitle}>
              {demoMode
                ? "Mock energy records"
                : "Retrieved from MongoDB Atlas"}
            </Text>
          </View>

          <Text style={styles.recordCount}>
            {demoMode
              ? `${mockHistoryRecords.length} records (Demo)`
              : `${readings.length} records (Atlas)`}
          </Text>
        </View>

        <View style={styles.recordsCard}>
          {loading && !hasRealData && !demoMode ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={C.green} size="small" />
              <Text style={styles.loadingText}>Loading historical records...</Text>
            </View>
          ) : demoMode ? (
            // Demo mode records
            mockHistoryRecords.map((record, index) => (
              <View
                key={record.id}
                style={[
                  styles.recordRow,
                  index === mockHistoryRecords.length - 1 && styles.lastRecord,
                ]}
              >
                <View style={styles.recordIcon}>
                  <Text style={styles.recordIconText}>ϟ</Text>
                </View>

                <View style={styles.recordDetails}>
                  <Text style={styles.recordDate}>{record.date}</Text>
                  <Text style={styles.recordTime}>{record.time}</Text>
                </View>

                <View style={styles.recordNumbers}>
                  <Text style={styles.recordEnergy}>{record.energy}</Text>
                  <Text style={styles.recordCost}>{record.cost}</Text>
                </View>
              </View>
            ))
          ) : readings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No records in database</Text>
              <Text style={styles.emptyText}>
                No sensor readings have been saved to Atlas yet. Use POST /api/readings or test scripts to save data.
              </Text>
            </View>
          ) : (
            // Real MongoDB Atlas historical records (shown in chronological order)
            readings.map((readingItem, index) => {
              const { date, time } = formatTimestamp(readingItem.timestamp);
              const costCalc = `৳${((readingItem.energy || 0) * TARIFF_RATE).toFixed(2)}`;
              const energyFormatted = `${(readingItem.energy || 0).toFixed(3)} kWh`;

              return (
                <View
                  key={readingItem._id || index.toString()}
                  style={[
                    styles.recordRow,
                    index === readings.length - 1 && styles.lastRecord,
                  ]}
                >
                  <View style={styles.recordIcon}>
                    <Text style={styles.recordIconText}>⚡</Text>
                  </View>

                  <View style={styles.recordDetails}>
                    <Text style={styles.recordDate}>{date}</Text>
                    <Text style={styles.recordTime}>
                      {time} · {readingItem.deviceId}
                    </Text>
                  </View>

                  <View style={styles.recordNumbers}>
                    <Text style={styles.recordEnergy}>{energyFormatted}</Text>
                    <Text style={styles.recordCost}>
                      {(readingItem.power || 0).toFixed(1)} W ({costCalc})
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Information Notice */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About historical data</Text>
          <Text style={styles.infoText}>
            Readings listed above are verified BSON documents from your
            MongoDB Atlas collection. Hardware PZEM sensor calibration and
            actual ESP32 telemetry will be connected in the next phase.
          </Text>
        </View>

        <Text style={styles.footer}>WattWise · Make every unit count</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 15,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    ...Typography.heading.extraBold,
    fontSize: 24,
    color: C.green,
    letterSpacing: -0.7,
  },
  subtitle: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  headerBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerBadgeText: {
    ...Typography.body.bold,
    color: C.green,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F5C6CB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  errorTextCol: {
    marginBottom: 10,
  },
  errorTitle: {
    ...Typography.heading.bold,
    color: '#721C24',
    fontSize: 13,
    marginBottom: 3,
  },
  errorDescription: {
    ...Typography.body.regular,
    color: '#721C24',
    fontSize: 11,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: C.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  demoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DED8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoButtonText: {
    ...Typography.body.semiBold,
    color: C.text,
    fontSize: 11,
  },
  demoBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  demoBannerText: {
    ...Typography.body.semiBold,
    color: '#856404',
    fontSize: 11,
    flex: 1,
  },
  exitDemoButton: {
    backgroundColor: '#856404',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  exitDemoButtonText: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#EBEFE9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  selectedPeriod: {
    backgroundColor: C.surface,
  },
  periodText: {
    ...Typography.body.semiBold,
    fontSize: 12,
    color: C.muted,
  },
  selectedPeriodText: {
    ...Typography.body.bold,
    color: C.green,
  },
  mainCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  mainLabel: {
    ...Typography.body.bold,
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  mainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  mainValue: {
    ...Typography.number.bold,
    fontSize: 48,
    color: C.green,
    letterSpacing: -1.5,
  },
  mainUnit: {
    ...Typography.number.semiBold,
    fontSize: 18,
    color: C.muted,
    marginLeft: 6,
  },
  mainDescription: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  mainDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 18,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  costValue: {
    ...Typography.number.bold,
    color: C.green,
    fontSize: 20,
  },
  costIcon: {
    height: 38,
    width: 38,
    borderRadius: 14,
    backgroundColor: '#FBF3E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  costIconText: {
    fontSize: 17,
    color: C.orange,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartSubtitle: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
  },
  chartUnit: {
    ...Typography.body.bold,
    color: C.muted,
    fontSize: 11,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 155,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    ...Typography.number.semiBold,
    fontSize: 9,
    color: C.muted,
    marginBottom: 6,
  },
  barTrack: {
    height: 125,
    width: 14,
    backgroundColor: '#EEF2EB',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: '#8EB9A0',
    borderRadius: 7,
    width: '100%',
  },
  highestBar: {
    backgroundColor: C.green,
  },
  barLabel: {
    ...Typography.body.semiBold,
    fontSize: 10,
    color: C.muted,
    marginTop: 8,
  },
  sectionTitle: {
    ...Typography.heading.bold,
    fontSize: 16,
    color: C.green,
  },
  sectionSubtitle: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  insightIcon: {
    fontSize: 18,
    color: C.green,
    marginBottom: 10,
  },
  insightLabel: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  insightValue: {
    ...Typography.number.bold,
    fontSize: 18,
    color: C.green,
  },
  insightHint: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recordCount: {
    ...Typography.body.semiBold,
    color: C.muted,
    fontSize: 11,
  },
  recordsCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 8,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.heading.bold,
    fontSize: 13,
    color: C.green,
    marginBottom: 4,
  },
  emptyText: {
    ...Typography.body.regular,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F1',
  },
  lastRecord: {
    borderBottomWidth: 0,
  },
  recordIcon: {
    height: 38,
    width: 38,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordIconText: {
    fontSize: 14,
    color: C.green,
  },
  recordDetails: {
    flex: 1,
  },
  recordDate: {
    ...Typography.body.bold,
    fontSize: 13,
    color: C.text,
    marginBottom: 2,
  },
  recordTime: {
    ...Typography.body.regular,
    fontSize: 11,
    color: C.muted,
  },
  recordNumbers: {
    alignItems: 'flex-end',
  },
  recordEnergy: {
    ...Typography.number.bold,
    fontSize: 12,
    color: C.green,
  },
  recordCost: {
    ...Typography.number.regular,
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#F0F5F2',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#DDE8E1',
  },
  infoTitle: {
    ...Typography.heading.bold,
    fontSize: 12,
    color: C.green,
    marginBottom: 4,
  },
  infoText: {
    ...Typography.body.regular,
    color: '#4B6256',
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    ...Typography.body.regular,
    textAlign: 'center',
    color: C.muted,
    fontSize: 11,
  },
});
