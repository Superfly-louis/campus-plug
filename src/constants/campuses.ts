export const campuses = [
  'Miotso (Main campus)',
  'Accra (City campus)',
  'Kumasi Campus',
] as const;

export type Campus = (typeof campuses)[number];

export function isCampus(value: string): value is Campus {
  return (campuses as readonly string[]).includes(value);
}
