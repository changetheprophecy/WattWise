
export const mockReadings = {
  deviceId: 'wattwise-001',
  voltage: 220.5,
  current: 0.45,
  power: 99.2,
  energy: 2.84,
  frequency: 50.0,
  powerFactor: 0.98,
  estimatedCost: 24.50,
  isConnected: true,
};

export const weeklyUsage = [
  { day: 'Mon', energy: 2.1 },
  { day: 'Tue', energy: 2.8 },
  { day: 'Wed', energy: 1.9 },
  { day: 'Thu', energy: 3.2 },
  { day: 'Fri', energy: 2.5 },
  { day: 'Sat', energy: 3.8 },
  { day: 'Sun', energy: 2.84 },
];

export const recentActivity = [
  {
    id: '1',
    title: 'Monitoring started',
    time: 'Today, 8:00 AM',
    value: 'Device connected',
  },
  {
    id: '2',
    title: 'Energy consumption',
    time: 'Today, 10:30 AM',
    value: '0.42 kWh recorded',
  },
  {
    id: '3',
    title: 'Power update',
    time: 'Today, 12:15 PM',
    value: '99.2 W',
  },
];

export const analyticsData = {
  daily: {
    total: 2.84,
    cost: 24.50,
    average: 0.41,
    peak: 0.72,
    chart: [
      { label: '6 AM', value: 0.18 },
      { label: '8 AM', value: 0.42 },
      { label: '10 AM', value: 0.35 },
      { label: '12 PM', value: 0.72 },
      { label: '2 PM', value: 0.48 },
      { label: '4 PM', value: 0.29 },
      { label: '6 PM', value: 0.40 },
    ],
  },
  weekly: {
    total: 18.24,
    cost: 157.35,
    average: 2.61,
    peak: 3.80,
    chart: [
      { label: 'Mon', value: 2.1 },
      { label: 'Tue', value: 2.8 },
      { label: 'Wed', value: 1.9 },
      { label: 'Thu', value: 3.2 },
      { label: 'Fri', value: 2.5 },
      { label: 'Sat', value: 3.8 },
      { label: 'Sun', value: 1.94 },
    ],
  },
  monthly: {
    total: 76.80,
    cost: 663.17,
    average: 2.56,
    peak: 3.80,
    chart: [
      { label: 'Week 1', value: 16.2 },
      { label: 'Week 2', value: 18.5 },
      { label: 'Week 3', value: 20.1 },
      { label: 'Week 4', value: 22.0 },
    ],
  },
};

export const historyRecords = [
  {
    id: '1',
    date: 'Today',
    time: '12:00 PM',
    energy: '2.84 kWh',
    cost: '৳24.50',
  },
  {
    id: '2',
    date: 'Yesterday',
    time: '11:59 PM',
    energy: '2.65 kWh',
    cost: '৳22.86',
  },
  {
    id: '3',
    date: '12 Nov 2026',
    time: '11:59 PM',
    energy: '3.10 kWh',
    cost: '৳26.74',
  },
  {
    id: '4',
    date: '11 Nov 2026',
    time: '11:59 PM',
    energy: '2.42 kWh',
    cost: '৳20.87',
  },
  {
    id: '5',
    date: '10 Nov 2026',
    time: '11:59 PM',
    energy: '2.95 kWh',
    cost: '৳25.45',
  },
];
