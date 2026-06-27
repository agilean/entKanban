export const ENGINE_VERSION = '0.1.0';

export { ClassOfService } from './ClassOfService.js';
export { State } from './State.js';
export { Day } from './Day.js';
export { DayStore } from './DayStore.js';
export { DaysFactory } from './DaysFactory.js';
export { Context } from './Context.js';
export { Board } from './Board.js';
export { isValidAdvance, COLUMN_NEXT, COLUMN_UPSTREAM } from './board/columnFlow.js';
export type { FlowColumnId } from './board/columnFlow.js';
export type { AdvanceCheckResult } from './board/advanceCheck.js';
export { WipLimitAdjustment } from './WipLimitAdjustment.js';
export { runDay, runDays } from './day/runDay.js';
export { FinancialSummary } from './finance/FinancialSummary.js';
export { BILLING_DAYS, isBillingDay } from './finance/billingDays.js';
export type { BillingDay } from './finance/billingDays.js';
export { RunConfiguration } from './simulation/RunConfiguration.js';
export { runAutoGame, defaultRunConfiguration } from './simulation/runAutoGame.js';

export { GamePhase } from './session/GamePhase.js';
export type { PendingAction } from './session/PendingAction.js';
export type { PlayerAction, DiceAssignmentInput } from './session/PlayerAction.js';
export type { DispatchResult } from './session/DispatchResult.js';
export type { GameSessionState, WipAdjustmentState } from './session/GameSessionState.js';
export type { BoardSnapshot, CardWorkSnapshot, StateColumnSlot } from './session/boardSnapshot.js';
export { captureBoardSnapshot, applyBoardSnapshot } from './session/boardSnapshot.js';
export type { CardEffectEvent, CardEffectKind } from './session/CardEffectEvent.js';
export { replaySpecialCardEffects, mergeEffectEvents } from './session/cardEffectEvents.js';
export { GameSession } from './session/GameSession.js';
export type { GameSessionOptions } from './session/GameSession.js';

export type { DaySnapshot, ColumnWipCounts, DeployedCardMetrics } from './history/DaySnapshot.js';
export { DaySnapshotStore } from './history/DaySnapshotStore.js';
export { createDaySnapshot, captureWipCounts } from './history/createDaySnapshot.js';
export type { DiceRollLogEntry } from './history/DiceRollLogEntry.js';
export { cloneDiceRollLogEntry } from './history/DiceRollLogEntry.js';

export type { BlockerRollResult } from './Day.js';

export type { Instruction } from './instructions/Instruction.js';
export { PeteFromPlatformTeam } from './instructions/PeteFromPlatformTeam.js';
export { CarlosHired } from './instructions/CarlosHired.js';
export { CarlosFired } from './instructions/CarlosFired.js';
export { MargaretsFeatures } from './instructions/MargaretsFeatures.js';
export { BigCorpExpedite } from './instructions/BigCorpExpedite.js';
export { DefectFound } from './instructions/DefectFound.js';
export { TedsTrainingOpportunity } from './instructions/TedsTrainingOpportunity.js';
export { GraduateGlenExpedite } from './instructions/GraduateGlenExpedite.js';
export { TammyHired } from './instructions/TammyHired.js';

export { CardSize, Blocker } from './card/Card.js';
export type { Card } from './card/Card.js';
export { getCard } from './card/Cards.js';
export { StandardCard } from './card/StandardCard.js';
export { FixedDateCard } from './card/FixedDateCard.js';
export { ExpediteCard } from './card/ExpediteCard.js';
export { IntangibleCard } from './card/IntangibleCard.js';

export { Options } from './column/Options.js';
export { SelectedColumn } from './column/SelectedColumn.js';
export { StateColumn } from './column/StateColumn.js';
export { ReadyToDeployColumn } from './column/ReadyToDeployColumn.js';
export { DeployedColumn } from './column/DeployedColumn.js';
export { NullColumn } from './column/NullColumn.js';

export { RandomDice } from './dice/RandomDice.js';
export { StateDice } from './dice/StateDice.js';
export { DiceGroup } from './dice/DiceGroup.js';
export type { Dice } from './dice/Dice.js';
export type { DiceRollApplyStep } from './dice/DiceRollApplyStep.js';
export {
  resolveDiceAssignments,
  buildDefaultDiceAssignments,
  buildDiceRollPreview,
  applyDiceRollStep,
} from './dice/rollDicePreview.js';

export type { DiceAssignmentStrategy } from './policies/DiceAssignmentStrategy.js';
export { NoCrossSkillingDiceAssignmentStrategy } from './policies/NoCrossSkillingDiceAssignmentStrategy.js';
export { ComplexDiceAssignmentStrategy } from './policies/ComplexDiceAssignmentStrategy.js';
export { expeditesCompare } from './policies/ExpeditesPrioritisationStrategy.js';
export { fixedDateCardsCompare } from './policies/FixedDateCardsPrioritisationStrategy.js';
export { intangiblesFirstCompare } from './policies/IntangiblesFirstPrioritisationStrategy.js';
export { businessValuePrioritisationCompare } from './policies/BusinessValuePrioritisationStrategy.js';
export { wipAgingCompare } from './policies/WipAgingPrioritisationStrategy.js';
export { wsjfCompare } from './policies/WeightedShortestJobFirstPrioritisationStrategy.js';
export { nameCompare } from './policies/nameCompare.js';
export { businessValueCompare } from './policies/prioritisation.js';
