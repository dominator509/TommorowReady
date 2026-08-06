export const planSections = [
  'People',
  'What We Own',
  'Documents and Locations',
  'Kids and Dependents',
  'Pets',
  'Home Playbook',
  'Wishes and Messages',
  'Packets',
  'Trusted Helpers',
  'Annual Review',
] as const;

export type PlanSection = (typeof planSections)[number];

export function sectionAnchor(section: PlanSection): string {
  return section.toLowerCase().replaceAll(' ', '-');
}
