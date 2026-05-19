export interface ClaimRecord {
  id: number;
  gender: '男' | '女';
  age: number;
  amount: number;
  disease: string;
  ageGroup: string;
}

export const diseases = [
  '高血压', '糖尿病', '冠心病', '糖尿病并发症', '脑梗塞',
  '恶性肿瘤', '慢性肾病', '关节炎', '肺炎', '胆囊炎',
  '腰椎间盘突出', '胃溃疡', '甲状腺疾病', '过敏性鼻炎', '哮喘'
];

const ageGroups = ['0-18', '19-30', '31-40', '41-50', '51-60', '61-70', '71+'];

const ageGroupInsuredCounts: Record<string, { male: number; female: number }> = {
  '0-18': { male: 25000, female: 23000 },
  '19-30': { male: 35000, female: 33000 },
  '31-40': { male: 40000, female: 38000 },
  '41-50': { male: 38000, female: 37000 },
  '51-60': { male: 30000, female: 29000 },
  '61-70': { male: 20000, female: 21000 },
  '71+': { male: 10000, female: 12000 }
};

function getAgeGroup(age: number): string {
  if (age <= 18) return '0-18';
  if (age <= 30) return '19-30';
  if (age <= 40) return '31-40';
  if (age <= 50) return '41-50';
  if (age <= 60) return '51-60';
  if (age <= 70) return '61-70';
  return '71+';
}

function generateRandomData(count: number): ClaimRecord[] {
  const records: ClaimRecord[] = [];
  const genders: ('男' | '女')[] = ['男', '女'];

  for (let i = 0; i < count; i++) {
    const gender = genders[Math.floor(Math.random() * 2)];
    const age = Math.floor(Math.random() * 70) + 1;
    const baseAmount = Math.floor(Math.random() * 50000) + 1000;
    const diseaseIndex = Math.floor(Math.random() * diseases.length);
    
    records.push({
      id: i + 1,
      gender,
      age,
      amount: baseAmount + (age > 50 ? Math.floor(Math.random() * 30000) : 0),
      disease: diseases[diseaseIndex],
      ageGroup: getAgeGroup(age)
    });
  }
  
  return records;
}

export const claimData: ClaimRecord[] = generateRandomData(2000);

export function filterDataByGender(data: ClaimRecord[], gender: '全部' | '男' | '女'): ClaimRecord[] {
  if (gender === '全部') return data;
  return data.filter(item => item.gender === gender);
}

export function getSummaryStats(data: ClaimRecord[]) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const avgAmount = data.length > 0 ? totalAmount / data.length : 0;
  
  return {
    totalAmount,
    avgAmount,
    totalCount: data.length
  };
}

export function getAmountDistribution(data: ClaimRecord[]): { range: string; count: number; avgAmount: number }[] {
  const ranges = [
    { min: 0, max: 0.5, label: '0-0.5万' },
    { min: 0.5, max: 1, label: '0.5-1万' },
    { min: 1, max: 2, label: '1-2万' },
    { min: 2, max: 3, label: '2-3万' },
    { min: 3, max: 5, label: '3-5万' },
    { min: 5, max: 8, label: '5-8万' },
    { min: 8, max: Infinity, label: '8万以上' }
  ];

  return ranges.map(range => {
    const items = data.filter(item => (item.amount / 10000) >= range.min && (item.amount / 10000) < range.max);
    const avgAmount = items.length > 0 
      ? items.reduce((sum, item) => sum + item.amount, 0) / items.length / 10000 
      : 0;
    return {
      range: range.label,
      count: items.length,
      avgAmount
    };
  });
}

export function getClaimRateByAgeGroup(
  data: ClaimRecord[],
  gender: '全部' | '男' | '女' = '全部'
): { ageGroup: string; rate: number; claimCount: number; insuredCount: number }[] {
  const ageGroupClaimCounts: Record<string, number> = {};

  ageGroups.forEach(group => {
    ageGroupClaimCounts[group] = 0;
  });

  data.forEach(item => {
    ageGroupClaimCounts[item.ageGroup]++;
  });

  return ageGroups.map(group => {
    const insuredData = ageGroupInsuredCounts[group];
    let insuredCount: number;
    
    if (gender === '男') {
      insuredCount = insuredData.male;
    } else if (gender === '女') {
      insuredCount = insuredData.female;
    } else {
      insuredCount = insuredData.male + insuredData.female;
    }
    
    const claimCount = ageGroupClaimCounts[group];
    const rate = insuredCount > 0 ? claimCount / insuredCount : 0;
    
    return {
      ageGroup: group,
      rate,
      claimCount,
      insuredCount
    };
  });
}

export function getTopDiseases(data: ClaimRecord[], top: number = 10): { disease: string; count: number }[] {
  const diseaseCounts: Record<string, number> = {};

  data.forEach(item => {
    if (!diseaseCounts[item.disease]) {
      diseaseCounts[item.disease] = 0;
    }
    diseaseCounts[item.disease]++;
  });

  return Object.entries(diseaseCounts)
    .map(([disease, count]) => ({ disease, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

export function getAgeVsAmount(data: ClaimRecord[]): { age: number; amount: number; gender: string }[] {
  return data.map(item => ({
    age: item.age,
    amount: item.amount / 10000,
    gender: item.gender
  }));
}
