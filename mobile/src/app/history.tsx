
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { analyticsData, historyRecords } from '@/services/mockData';

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
};

const periods: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function HistoryScreen() {
  const [period, setPeriod] = useState<Period>('weekly');

  const data = analyticsData[period];
  const maxValue = Math.max(...data.chart.map(item => item.value));

  const periodDescription = {
    daily: 'Hourly consumption today',
    weekly: 'Daily consumption this week',
    monthly: 'Weekly consumption this month',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>History & Analytics</Text>
            <Text style={styles.subtitle}>
              Understand your energy habits
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>↗</Text>
          </View>
        </View>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {periods.map(item => {
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
            <Text style={styles.mainValue}>{data.total.toFixed(2)}</Text>
            <Text style={styles.mainUnit}>kWh</Text>
          </View>

          <Text style={styles.mainDescription}>
            {periodDescription[period]}
          </Text>

          <View style={styles.mainDivider} />

          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Estimated electricity cost</Text>
              <Text style={styles.costValue}>
                ৳{data.cost.toFixed(2)}
              </Text>
            </View>

            <View style={styles.costIcon}>
              <Text style={styles.costIconText}>৳</Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Consumption trend</Text>
              <Text style={styles.sectionSubtitle}>
                {periodDescription[period]}
              </Text>
            </View>
            <Text style={styles.chartUnit}>kWh</Text>
          </View>

          <View style={styles.chart}>
            {data.chart.map((item, index) => {
              const height = Math.max(
                (item.value / maxValue) * 125,
                5
              );
              const isHighest = item.value === maxValue;

              return (
                <View key={item.label} style={styles.barColumn}>
                  <Text style={styles.barValue}>
                    {item.value.toFixed(1)}
                  </Text>

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
            <Text style={styles.insightLabel}>Average usage</Text>
            <Text style={styles.insightValue}>
              {data.average.toFixed(2)}
              <Text style={styles.insightUnit}> kWh</Text>
            </Text>
            <Text style={styles.insightHint}>
              {period === 'daily' ? 'Per hour' : period === 'weekly' ? 'Per day' : 'Per day'}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>↗</Text>
            <Text style={styles.insightLabel}>Peak usage</Text>
            <Text style={styles.insightValue}>
              {data.peak.toFixed(2)}
              <Text style={styles.insightUnit}> kWh</Text>
            </Text>
            <Text style={styles.insightHint}>Highest recorded interval</Text>
          </View>
        </View>

        {/* Historical records */}
        <View style={styles.recordsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Historical records</Text>
            <Text style={styles.sectionSubtitle}>
              Previous energy summaries
            </Text>
          </View>

          <Text style={styles.recordCount}>5 records</Text>
        </View>

        <View style={styles.recordsCard}>
          {historyRecords.map((record, index) => (
            <View
              key={record.id}
              style={[
                styles.recordRow,
                index === historyRecords.length - 1 && styles.lastRecord,
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
          ))}
        </View>

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About these estimates</Text>
          <Text style={styles.infoText}>
            Energy and cost values are sample data for the frontend
            demonstration. Actual historical readings and tariff-based
            calculations will be available after backend integration.
          </Text>
        </View>

        <Text style={styles.footer}>
          WattWise · Make every unit count
        </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 23,
  },
  brand: {
    fontSize: 23,
    fontWeight: '800',
    color: C.green,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  headerIcon: {
    height: 42,
    width: 42,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 22,
    color: C.green,
    fontWeight: '800',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#E9EDE7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 11,
  },
  selectedPeriod: {
    backgroundColor: C.green,
  },
  periodText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPeriodText: {
    color: '#FFFFFF',
  },
  mainCard: {
    backgroundColor: C.green,
    borderRadius: 24,
    padding: 22,
    marginBottom: 23,
  },
  mainLabel: {
    color: '#B6C9BE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  mainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
  },
  mainValue: {
    color: '#FFFFFF',
    fontSize: 49,
    fontWeight: '800',
    letterSpacing: -2,
  },
  mainUnit: {
    color: '#D0DDD5',
    fontSize: 17,
    marginLeft: 7,
  },
  mainDescription: {
    color: '#B6C9BE',
    fontSize: 11,
    marginTop: 2,
  },
  mainDivider: {
    height: 1,
    backgroundColor: '#45665A',
    marginVertical: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    color: '#B6C9BE',
    fontSize: 11,
    marginBottom: 7,
  },
  costValue: {
    color: C.lime,
    fontSize: 23,
    fontWeight: '800',
  },
  costIcon: {
    height: 42,
    width: 42,
    borderRadius: 13,
    backgroundColor: '#285447',
    justifyContent: 'center',
    alignItems: 'center',
  },
  costIconText: {
    color: C.lime,
    fontSize: 21,
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 21,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 25,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  chartUnit: {
    color: C.muted,
    fontSize: 11,
  },
  chart: {
    height: 175,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValue: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 7,
  },
  barTrack: {
    height: 125,
    justifyContent: 'flex-end',
    width: 21,
  },
  bar: {
    width: 21,
    backgroundColor: '#DCE9DC',
    borderRadius: 7,
  },
  highestBar: {
    backgroundColor: C.green,
  },
  barLabel: {
    color: C.muted,
    fontSize: 9,
    marginTop: 9,
    textAlign: 'center',
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 25,
  },
  insightCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  insightIcon: {
    color: C.green,
    fontSize: 20,
    marginBottom: 12,
  },
  insightLabel: {
    color: C.muted,
    fontSize: 10,
  },
  insightValue: {
    color: C.text,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 7,
  },
  insightUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  insightHint: {
    color: C.muted,
    fontSize: 9,
    marginTop: 6,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recordCount: {
    color: C.green,
    fontSize: 10,
    fontWeight: '700',
  },
  recordsCard: {
    backgroundColor: C.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 11,
  },
  lastRecord: {
    borderBottomWidth: 0,
  },
  recordIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconText: {
    color: C.green,
    fontSize: 20,
    fontWeight: '800',
  },
  recordDetails: {
    flex: 1,
  },
  recordDate: {
    color: C.text,
    fontSize: 11,
    fontWeight: '700',
  },
  recordTime: {
    color: C.muted,
    fontSize: 9,
    marginTop: 4,
  },
  recordNumbers: {
    alignItems: 'flex-end',
  },
  recordEnergy: {
    color: C.text,
    fontSize: 11,
    fontWeight: '700',
  },
  recordCost: {
    color: C.green,
    fontSize: 10,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#EEF2EA',
    borderRadius: 15,
    padding: 15,
  },
  infoTitle: {
    color: C.green,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoText: {
    color: '#65746A',
    fontSize: 10,
    lineHeight: 17,
  },
  footer: {
    color: C.muted,
    textAlign: 'center',
    fontSize: 10,
    marginTop: 23,
  },
});
