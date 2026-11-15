import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getLatestReading } from "@/services/api";
import { mockReadings, recentActivity, weeklyUsage } from "@/services/mockData";
import { Reading } from "@/services/types";

const C = {
  background: "#F5F7F2",
  surface: "#FFFFFF",
  green: "#123D32",
  greenLight: "#E7F0E9",
  lime: "#B7E36A",
  text: "#26352F",
  muted: "#87918A",
  border: "#E9EDE7",
  orange: "#E9A34B",
  red: "#D9534F",
};

export default function HomeScreen() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const fetchReading = useCallback(async () => {
    const result = await getLatestReading();
    if (result.error) {
      setError(result.error);
      setIsEmpty(false);
    } else if (result.isEmpty) {
      setReading(null);
      setIsEmpty(true);
      setError(null);
    } else {
      setReading(result.data);
      setError(null);
      setIsEmpty(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      await fetchReading();
      if (isMounted) setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchReading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReading();
    setRefreshing(false);
  }, [fetchReading]);

  const maxUsage = Math.max(...weeklyUsage.map((item) => item.energy));

  // Determine active data source
  const activeReading = demoMode ? mockReadings : reading;
  const isOnline = !demoMode && !error && (reading !== null || isEmpty);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
            <Text style={styles.brand}>
              WattWise<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.greeting}>Your energy at a glance</Text>
          </View>

          <View style={styles.profile}>
            <Text style={styles.profileText}>W</Text>
          </View>
        </View>

        {/* Connection status (Distinguishing backend vs physical hardware) */}
        <View style={styles.connectionRow}>
          <View style={styles.connectionLeft}>
            <View
              style={[
                styles.onlineDot,
                demoMode
                  ? styles.dotDemo
                  : error
                  ? styles.dotOffline
                  : styles.dotOnline,
              ]}
            />
            <Text style={styles.connectionText}>
              {demoMode
                ? "Demo Mode (Mock Data)"
                : error
                ? "Backend Offline"
                : isEmpty
                ? "Backend Online · No Readings"
                : "Backend Online · Test Data"}
            </Text>
          </View>
          <Text style={styles.deviceId}>
            {demoMode
              ? mockReadings.deviceId
              : activeReading?.deviceId || "Sensor pending"}
          </Text>
        </View>

        {/* Error notification banner if API fails */}
        {error && !demoMode && (
          <View style={styles.errorBanner}>
            <View style={styles.errorTextCol}>
              <Text style={styles.errorTitle}>Cannot connect to backend</Text>
              <Text style={styles.errorDescription}>{error}</Text>
            </View>
            <View style={styles.errorActions}>
              <Pressable
                onPress={fetchReading}
                style={styles.retryButton}
              >
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

        {/* Demo mode active banner */}
        {demoMode && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              Currently displaying local mock data.
            </Text>
            <Pressable
              onPress={() => {
                setDemoMode(false);
                fetchReading();
              }}
              style={styles.exitDemoButton}
            >
              <Text style={styles.exitDemoButtonText}>Exit Demo</Text>
            </Pressable>
          </View>
        )}

        {/* Main power card */}
        <View style={styles.powerCard}>
          <View style={styles.cardTop}>
            <Text style={styles.powerLabel}>CURRENT POWER</Text>
            <View style={styles.liveBadge}>
              <View
                style={[
                  styles.liveDot,
                  demoMode ? { backgroundColor: C.orange } : {},
                ]}
              />
              <Text
                style={[
                  styles.liveText,
                  demoMode ? { color: C.orange } : {},
                ]}
              >
                {demoMode ? "DEMO" : "TEST DATA"}
              </Text>
            </View>
          </View>

          {loading && !activeReading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={C.lime} size="large" />
              <Text style={styles.loadingText}>Loading latest reading...</Text>
            </View>
          ) : (
            <>
              <View style={styles.powerValueRow}>
                <Text style={styles.powerValue}>
                  {(activeReading?.power ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.powerUnit}>W</Text>
              </View>

              <Text style={styles.powerDescription}>
                {demoMode
                  ? "Demonstration power reading"
                  : "Database test reading (PZEM sensor integration pending)"}
              </Text>

              <View style={styles.powerDivider} />

              <View style={styles.powerFooter}>
                <View>
                  <Text style={styles.footerLabel}>Voltage</Text>
                  <Text style={styles.footerValue}>
                    {activeReading?.voltage ?? 0} V
                  </Text>
                </View>
                <View>
                  <Text style={styles.footerLabel}>Current</Text>
                  <Text style={styles.footerValue}>
                    {(activeReading?.current ?? 0).toFixed(2)} A
                  </Text>
                </View>
                <View>
                  <Text style={styles.footerLabel}>Power factor</Text>
                  <Text style={styles.footerValue}>
                    {(activeReading?.powerFactor ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Today's summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's summary</Text>
          <Text style={styles.todayText}>Today</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Text style={styles.iconText}>ϟ</Text>
            </View>
            <Text style={styles.summaryLabel}>Energy used</Text>
            <Text style={styles.summaryValue}>
              {(activeReading?.energy ?? 0).toFixed(2)}
              <Text style={styles.summaryUnit}> kWh</Text>
            </Text>
            <Text style={styles.summaryHint}>
              {demoMode ? "Sample calculation" : "Accumulated test energy"}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.costIcon]}>
              <Text style={styles.costIconText}>৳</Text>
            </View>
            <Text style={styles.summaryLabel}>Estimated cost</Text>
            <Text style={styles.summaryValue}>
              {((activeReading?.energy ?? 0) * 8.63).toFixed(2)}
              <Text style={styles.summaryUnit}> ৳</Text>
            </Text>
            <Text style={styles.summaryHint}>At ৳8.63 / kWh</Text>
          </View>
        </View>

        {/* Weekly chart (Visual trend demonstration) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Energy consumption</Text>
              <Text style={styles.chartSubtitle}>Your last 7 days (Sample trend)</Text>
            </View>
            <Text style={styles.chartUnit}>kWh</Text>
          </View>

          <View style={styles.chart}>
            {weeklyUsage.map((item, index) => {
              const height = (item.energy / maxUsage) * 112;
              const isToday = index === weeklyUsage.length - 1;

              return (
                <View key={item.day} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.energy.toFixed(1)}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height },
                        isToday && styles.activeBar,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.activeDay]}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.activityCount}>
            {!demoMode && reading?.timestamp
              ? "Last updated " +
                new Date(reading.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Status"}
          </Text>
        </View>

        <View style={styles.activityCard}>
          {recentActivity.map((item, index) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityIconText}>
                  {index === 0 ? "●" : index === 1 ? "ϟ" : "↗"}
                </Text>
              </View>

              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>

              <Text style={styles.activityValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.bottomNote}>
          WattWise · Smarter energy awareness
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
    paddingTop: 12,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  brand: {
    fontSize: 27,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -1,
  },
  brandDot: {
    color: "#9ACB4D",
  },
  greeting: {
    color: C.muted,
    fontSize: 13,
    marginTop: 3,
  },
  profile: {
    height: 42,
    width: 42,
    borderRadius: 15,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontSize: 17,
    fontWeight: "700",
    color: C.green,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  connectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: "#48A66B",
  },
  dotOffline: {
    backgroundColor: C.red,
  },
  dotDemo: {
    backgroundColor: C.orange,
  },
  connectionText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600",
  },
  deviceId: {
    color: C.muted,
    fontSize: 11,
  },
  errorBanner: {
    backgroundColor: "#FDECEA",
    borderWidth: 1,
    borderColor: "#F5C6CB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  errorTextCol: {
    marginBottom: 10,
  },
  errorTitle: {
    color: "#721C24",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  errorDescription: {
    color: "#721C24",
    fontSize: 11,
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
  },
  retryButton: {
    backgroundColor: C.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  demoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9DED8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoButtonText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "600",
  },
  demoBanner: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFEEBA",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  demoBannerText: {
    color: "#856404",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  exitDemoButton: {
    backgroundColor: "#856404",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  exitDemoButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  powerCard: {
    backgroundColor: C.green,
    borderRadius: 25,
    padding: 22,
    marginBottom: 27,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  powerLabel: {
    color: "#B6C9BE",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  liveBadge: {
    backgroundColor: "#285447",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    backgroundColor: C.lime,
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  liveText: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  loadingContainer: {
    paddingVertical: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#B6C9BE",
    fontSize: 12,
    marginTop: 10,
  },
  powerValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 15,
  },
  powerValue: {
    fontSize: 54,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -2,
  },
  powerUnit: {
    fontSize: 19,
    color: "#D0DDD5",
    marginLeft: 7,
  },
  powerDescription: {
    color: "#B6C9BE",
    fontSize: 12,
    marginTop: 1,
  },
  powerDivider: {
    height: 1,
    backgroundColor: "#45665A",
    marginVertical: 20,
  },
  powerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLabel: {
    color: "#B6C9BE",
    fontSize: 10,
    marginBottom: 7,
  },
  footerValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.green,
  },
  todayText: {
    color: C.muted,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 13,
    marginBottom: 27,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    height: 38,
    width: 38,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  costIcon: {
    backgroundColor: "#FBF3E8",
  },
  iconText: {
    fontSize: 17,
    color: C.green,
    fontWeight: "800",
  },
  costIconText: {
    fontSize: 16,
    color: C.orange,
    fontWeight: "700",
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 11,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -0.5,
  },
  summaryUnit: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
  },
  summaryHint: {
    color: C.muted,
    fontSize: 10,
    marginTop: 6,
  },
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 19,
    marginBottom: 27,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  chartSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
  },
  chartUnit: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 148,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barValue: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 6,
    fontWeight: "600",
  },
  barTrack: {
    height: 112,
    width: 14,
    backgroundColor: "#EEF2EB",
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    backgroundColor: "#8EB9A0",
    borderRadius: 7,
    width: "100%",
  },
  activeBar: {
    backgroundColor: C.green,
  },
  barDay: {
    fontSize: 10,
    color: C.muted,
    marginTop: 8,
    fontWeight: "600",
  },
  activeDay: {
    color: C.green,
    fontWeight: "800",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  activityCount: {
    color: C.muted,
    fontSize: 11,
  },
  activityCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 7,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
  },
  activityIcon: {
    height: 38,
    width: 38,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  activityIconText: {
    fontSize: 14,
    color: C.green,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.green,
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 11,
    color: C.muted,
  },
  activityValue: {
    fontSize: 12,
    fontWeight: "700",
    color: C.green,
  },
  bottomNote: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    marginTop: 6,
  },
});
