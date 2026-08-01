import { AlertSeverity, AlertType, RiskLevel } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface RiskResult {
  score: number;
  niveau: RiskLevel;
  facteurs: string[];
  stadeRecommande: string;
}

export interface IRiskPredictor {
  calculate(patientId: string): Promise<RiskResult>;
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return RiskLevel.VERY_HIGH;
  if (score >= 50) return RiskLevel.HIGH;
  if (score >= 25) return RiskLevel.MODERATE;
  return RiskLevel.LOW;
}

function recommendStage(weeksSinceProcedure: number, activityMinutes: number): string {
  if (weeksSinceProcedure < 2) return 'Stade I';
  if (weeksSinceProcedure < 6 && activityMinutes < 90) return 'Stade II';
  if (weeksSinceProcedure < 12 && activityMinutes < 150) return 'Stade III';
  return 'Stade IV';
}

export class ClinicalRiskPredictor implements IRiskPredictor {
  async calculate(patientId: string): Promise<RiskResult> {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        followUps: { orderBy: { semaine: 'desc' }, take: 4 },
        medications: { where: { actif: true } },
      },
    });

    if (!patient) throw new Error('Patient introuvable');

    const latest = patient.followUps[0];
    const facteurs: string[] = [];
    let score = 0;

    if (!latest) {
      return { score: 50, niveau: RiskLevel.MODERATE, facteurs: ['Aucun suivi enregistré'], stadeRecommande: patient.stadeRecommande };
    }

    const imc = latest.poids / Math.pow(patient.taille / 100, 2);

    if (latest.tensionSys >= 140 || latest.tensionDia >= 90) {
      score += 25;
      facteurs.push(`Tension élevée (${latest.tensionSys}/${latest.tensionDia} mmHg)`);
    } else if (latest.tensionSys >= 130 || latest.tensionDia >= 85) {
      score += 12;
      facteurs.push('Tension limite');
    }

    if (latest.ldl > 1.6) {
      score += 20;
      facteurs.push(`LDL élevé (${latest.ldl} g/L)`);
    } else if (latest.ldl > 1.3) {
      score += 10;
      facteurs.push('LDL limite');
    }

    if (imc >= 30) {
      score += 15;
      facteurs.push(`IMC élevé (${imc.toFixed(1)})`);
    } else if (imc >= 25) {
      score += 8;
      facteurs.push('Surpoids');
    }

    if (latest.tabac) {
      score += 20;
      facteurs.push('Tabagisme actif');
    }

    if (latest.diabete) {
      score += 15;
      facteurs.push('Diabète');
    }

    const adherence = latest.medicamentsTotal > 0
      ? (latest.medicamentsPris / latest.medicamentsTotal) * 100
      : 100;

    if (adherence < 70) {
      score += 15;
      facteurs.push(`Faible adhésion médicamenteuse (${adherence.toFixed(0)}%)`);
    }

    if (latest.activiteMinutes < 90) {
      score += 10;
      facteurs.push(`Activité physique insuffisante (${latest.activiteMinutes} min/semaine)`);
    }

    score = Math.min(100, score);
    const niveau = getRiskLevel(score);

    const weeksSince = Math.floor(
      (Date.now() - patient.dateProcedure.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const stadeRecommande = recommendStage(weeksSince, latest.activiteMinutes);

    return { score, niveau, facteurs, stadeRecommande };
  }
}

export async function detectAnomalies(patientId: string, followUpId: string) {
  const followUp = await prisma.weeklyFollowUp.findUnique({ where: { id: followUpId } });
  if (!followUp) return [];

  const alerts: { type: AlertType; severite: AlertSeverity; message: string }[] = [];

  if (followUp.tensionSys >= 160 || followUp.tensionDia >= 100) {
    alerts.push({
      type: AlertType.BLOOD_PRESSURE,
      severite: AlertSeverity.CRITICAL,
      message: `Hypertension sévère détectée : ${followUp.tensionSys}/${followUp.tensionDia} mmHg`,
    });
  } else if (followUp.tensionSys >= 140 || followUp.tensionDia >= 90) {
    alerts.push({
      type: AlertType.BLOOD_PRESSURE,
      severite: AlertSeverity.HIGH,
      message: `Tension artérielle élevée : ${followUp.tensionSys}/${followUp.tensionDia} mmHg`,
    });
  }

  if (followUp.ldl > 1.9) {
    alerts.push({
      type: AlertType.LDL,
      severite: AlertSeverity.HIGH,
      message: `LDL très élevé : ${followUp.ldl} g/L`,
    });
  } else if (followUp.ldl > 1.6) {
    alerts.push({
      type: AlertType.LDL,
      severite: AlertSeverity.MEDIUM,
      message: `LDL au-dessus de l'objectif : ${followUp.ldl} g/L`,
    });
  }

  const adherence = followUp.medicamentsTotal > 0
    ? (followUp.medicamentsPris / followUp.medicamentsTotal) * 100
    : 100;

  if (adherence < 50) {
    alerts.push({
      type: AlertType.MEDICATION,
      severite: AlertSeverity.HIGH,
      message: `Adhésion médicamenteuse critique : ${adherence.toFixed(0)}%`,
    });
  } else if (adherence < 70) {
    alerts.push({
      type: AlertType.MEDICATION,
      severite: AlertSeverity.MEDIUM,
      message: `Adhésion médicamenteuse faible : ${adherence.toFixed(0)}%`,
    });
  }

  if (followUp.activiteMinutes < 60) {
    alerts.push({
      type: AlertType.ACTIVITY,
      severite: AlertSeverity.LOW,
      message: `Activité physique insuffisante : ${followUp.activiteMinutes} min cette semaine`,
    });
  }

  const previous = await prisma.weeklyFollowUp.findFirst({
    where: { patientId, semaine: { lt: followUp.semaine } },
    orderBy: { semaine: 'desc' },
  });

  if (previous && followUp.poids - previous.poids > 2) {
    alerts.push({
      type: AlertType.WEIGHT,
      severite: AlertSeverity.MEDIUM,
      message: `Prise de poids significative : +${(followUp.poids - previous.poids).toFixed(1)} kg`,
    });
  }

  return alerts;
}

export async function processFollowUpAnalysis(patientId: string, followUpId: string) {
  const predictor = new ClinicalRiskPredictor();
  const risk = await predictor.calculate(patientId);
  const anomalies = await detectAnomalies(patientId, followUpId);

  await prisma.riskPrediction.create({
    data: {
      patientId,
      score: risk.score,
      niveau: risk.niveau,
      facteurs: risk.facteurs,
    },
  });

  await prisma.patientProfile.update({
    where: { id: patientId },
    data: { stadeRecommande: risk.stadeRecommande },
  });

  const createdAlerts = [];
  for (const alert of anomalies) {
    const created = await prisma.alert.create({
      data: { patientId, ...alert },
    });
    createdAlerts.push(created);
  }

  return { risk, alerts: createdAlerts };
}
