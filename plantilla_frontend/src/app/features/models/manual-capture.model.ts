export type FiscalCondition = 'without-incentive' | 'with-incentive';

export interface CaptureRecord {
  condition: FiscalCondition;
  actions: number;
  men: number;
  women: number;
  other: number;
}

export interface MunicipalityOption {
  id: string;
  name: string;
  region: string;
}

export interface CapturedMunicipality extends MunicipalityOption {
  records: CaptureRecord[];
}
