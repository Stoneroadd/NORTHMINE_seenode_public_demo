import { secureApi } from '../lib/secureApi'
import { withAnalysisQuery } from '../lib/queryParams'
import type { AnalysisFilters } from '../components/filters/filterTypes'
import type {
  OperatorDelayPatternsResponse,
  OperatorRankingAudit,
  OperatorRankingAuditLogResponse,
  OperatorRankingDetail,
  OperatorRankingMethodology,
  OperatorRankingResponse,
  OperatorRankingResponsibleUse,
  OperatorRankingThresholds,
  OperatorTrendsResponse,
  ScoreExplanation,
} from '../types/operatorRanking'

function withOperator(filters?: AnalysisFilters, operatorId?: string) {
  return operatorId ? { ...filters, operatorId } : filters
}

export async function getOperatorRankingGlobal(filters?: AnalysisFilters): Promise<OperatorRankingResponse> {
  const { data } = await secureApi.get<OperatorRankingResponse>(withAnalysisQuery('/api/operator-ranking/global', filters))
  return data
}

export async function getOperatorRankingMethodology(): Promise<OperatorRankingMethodology> {
  const { data } = await secureApi.get<OperatorRankingMethodology>('/api/operator-ranking/methodology')
  return data
}

export async function getOperatorRankingThresholds(): Promise<OperatorRankingThresholds> {
  const { data } = await secureApi.get<OperatorRankingThresholds>('/api/operator-ranking/thresholds')
  return data
}

export async function getOperatorRankingResponsibleUse(): Promise<OperatorRankingResponsibleUse> {
  const { data } = await secureApi.get<OperatorRankingResponsibleUse>('/api/operator-ranking/responsible-use')
  return data
}

export async function getOperatorRankingAudit(operatorId: string, filters?: AnalysisFilters): Promise<OperatorRankingAudit> {
  const { data } = await secureApi.get<OperatorRankingAudit>(withAnalysisQuery('/api/operator-ranking/audit', withOperator(filters, operatorId)))
  return data
}

export async function getOperatorRankingAuditLog(filters?: AnalysisFilters): Promise<OperatorRankingAuditLogResponse> {
  const { data } = await secureApi.get<OperatorRankingAuditLogResponse>(withAnalysisQuery('/api/operator-ranking/audit-log', filters))
  return data
}

export async function getOperatorRankingDetail(operatorId: string, filters?: AnalysisFilters): Promise<OperatorRankingDetail> {
  const { data } = await secureApi.get<OperatorRankingDetail>(withAnalysisQuery('/api/operator-ranking/detail', withOperator(filters, operatorId)))
  return data
}

export async function getOperatorRankingTrends(filters?: AnalysisFilters): Promise<OperatorTrendsResponse> {
  const { data } = await secureApi.get<OperatorTrendsResponse>(withAnalysisQuery('/api/operator-ranking/trends', filters))
  return data
}

export async function getOperatorDelayPatterns(filters?: AnalysisFilters): Promise<OperatorDelayPatternsResponse> {
  const { data } = await secureApi.get<OperatorDelayPatternsResponse>(withAnalysisQuery('/api/operator-ranking/delay-patterns', filters))
  return data
}

export async function getOperatorScoreExplanation(operatorId: string, filters?: AnalysisFilters): Promise<ScoreExplanation> {
  const { data } = await secureApi.get<ScoreExplanation>(withAnalysisQuery('/api/operator-ranking/score-explanation', withOperator(filters, operatorId)))
  return data
}

export async function exportOperatorRankingCsv(filters?: AnalysisFilters): Promise<Blob> {
  const { data } = await secureApi.get<Blob>(withAnalysisQuery('/api/operator-ranking/export-csv', filters), {
    responseType: 'blob',
  })
  return data
}
