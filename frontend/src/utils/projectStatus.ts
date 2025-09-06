export type FEProjectStatus = 'draft' | 'active' | 'archived';
export type BEProjectStatus = 'proposal' | 'active' | 'closed';

const feToBeMap: Record<FEProjectStatus, BEProjectStatus> = {
  draft: 'proposal',
  active: 'active',
  archived: 'closed',
};

const beToFeMap: Record<BEProjectStatus, FEProjectStatus> = {
  proposal: 'draft',
  active: 'active',
  closed: 'archived',
};

export const mapFEToBEStatus = (s: FEProjectStatus): BEProjectStatus => feToBeMap[s];
export const mapBEToFEStatus = (s: BEProjectStatus): FEProjectStatus => beToFeMap[s];

export const isFEProjectStatus = (v: unknown): v is FEProjectStatus =>
  v === 'draft' || v === 'active' || v === 'archived';

