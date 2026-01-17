import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PEDESTRIAN_SKIN_COLORS, PEDESTRIAN_SHIRT_COLORS, PEDESTRIAN_PANTS_COLORS, PEDESTRIAN_HAT_COLORS } from '@/components/game/constants';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  dateOfBirth: string;
  race: string;
  preferences?: string;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hasHat: boolean;
  hatColor: string | null;
  relationshipArc: string;
  dateSummary: string;
  compatibilityInsight: string;
  createdAt: string;
}

const RACE_SKIN_TONE_MAP: Record<string, string[]> = {
  'caucasian': ['#ffe4c4', '#ffd5b8', '#ffc8a8', '#fdbf7e'],
  'african': ['#8d5524', '#613318', '#c68642', '#e0ac69'],
  'asian': ['#ffd5b8', '#ffc8a8', '#fdbf7e', '#e0ac69'],
  'hispanic': ['#fdbf7e', '#e0ac69', '#c68642', '#ffc8a8'],
  'middle eastern': ['#fdbf7e', '#e0ac69', '#c68642', '#ffd5b8'],
  'native american': ['#c68642', '#e0ac69', '#fdbf7e', '#ffc8a8'],
  'pacific islander': ['#c68642', '#e0ac69', '#fdbf7e', '#8d5524'],
  'mixed': ['#ffd5b8', '#fdbf7e', '#e0ac69', '#c68642', '#8d5524'],
  'other': PEDESTRIAN_SKIN_COLORS,
};

function generateCharacterAppearance(name: string, gender: 'male' | 'female', race: string, age: number): {
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hasHat: boolean;
  hatColor: string | null;
} {
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = nameHash + age;
  
  const raceLower = race.toLowerCase();
  const skinTones = RACE_SKIN_TONE_MAP[raceLower] || RACE_SKIN_TONE_MAP['other'];
  const skinColor = skinTones[seed % skinTones.length];
  
  const shirtColor = PEDESTRIAN_SHIRT_COLORS[(seed * 3) % PEDESTRIAN_SHIRT_COLORS.length];
  const pantsColor = PEDESTRIAN_PANTS_COLORS[(seed * 5) % PEDESTRIAN_PANTS_COLORS.length];
  
  const hasHat = (seed % 4) === 0;
  const hatColor = hasHat ? PEDESTRIAN_HAT_COLORS[(seed * 7) % PEDESTRIAN_HAT_COLORS.length] : null;
  
  return {
    skinColor,
    shirtColor,
    pantsColor,
    hasHat,
    hatColor,
  };
}

const DB_PATH = join(process.cwd(), 'data', 'users.json');

async function readDatabase(): Promise<UserProfile[]> {
  try {
    const data = await readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeDatabase(users: UserProfile[]): Promise<void> {
  const dir = join(process.cwd(), 'data');
  await mkdir(dir, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

export async function createUser(userInput: {
  name: string;
  age: number;
  gender: 'male' | 'female';
  dateOfBirth: string;
  race: string;
  preferences?: string;
}): Promise<UserProfile> {
  const users = await readDatabase();
  const appearance = generateCharacterAppearance(userInput.name, userInput.gender, userInput.race, userInput.age);
  
  const newUser: UserProfile = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: userInput.name,
    age: userInput.age,
    gender: userInput.gender,
    dateOfBirth: userInput.dateOfBirth,
    race: userInput.race,
    preferences: userInput.preferences,
    ...appearance,
    relationshipArc: 'Coming soon...',
    dateSummary: 'No dates recorded yet.',
    compatibilityInsight: 'Analysis pending...',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await writeDatabase(users);
  return newUser;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  return readDatabase();
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const users = await readDatabase();
  return users.find(u => u.id === id) || null;
}

