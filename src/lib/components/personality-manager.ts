import { PersonalityTraits } from "@/types/ai-girlfriend";

interface TraitLimits {
  min: number;
  max: number;
}

interface Archetype {
  romantic_intensity: number;
  loyalty: number;
  vulnerability: number;
  possessiveness: number;
  confidence?: number;
  sensuality?: number;
  assertiveness?: number;
  playfulness?: number;
  curiosity?: number;
  intelligence?: number;
  empathy?: number;
  humor?: number;
}

interface TraitHistory {
  timestamp: string;
  trait: string;
  old_value: number;
  new_value: number;
  adjustment: number;
  context: string;
}

interface MoodModifiers {
  [trait: string]: number;
}

export class PersonalityManager {
  traits: PersonalityTraits;
  traitLimits: Record<keyof PersonalityTraits, TraitLimits>;
  traitHistory: TraitHistory[];
  archetypes: Record<string, Archetype>;
  currentMoods: Record<string, MoodModifiers>;
  moodDuration: Record<string, number>;

  constructor() {
    // Base personality traits (0.0 to 1.0 scale) - exact from Python
    this.traits = {
      confidence: 0.7,
      romantic_intensity: 0.8,
      playfulness: 0.6,
      vulnerability: 0.4,
      assertiveness: 0.5,
      curiosity: 0.6,
      empathy: 0.7,
      spontaneity: 0.5,
      possessiveness: 0.3,
      loyalty: 0.8,
      sensuality: 0.8,
      intelligence: 0.7,
      humor: 0.6,
      emotional_intensity: 0.7,
      independence: 0.5
    };

    // Trait evolution limits to maintain personality consistency - exact from Python
    this.traitLimits = {
      confidence: { min: 0.3, max: 1.0 },
      romantic_intensity: { min: 0.6, max: 1.0 },
      playfulness: { min: 0.2, max: 0.9 },
      vulnerability: { min: 0.1, max: 0.9 },
      assertiveness: { min: 0.2, max: 0.9 },
      curiosity: { min: 0.4, max: 0.9 },
      empathy: { min: 0.5, max: 1.0 },
      spontaneity: { min: 0.2, max: 0.8 },
      possessiveness: { min: 0.1, max: 0.7 },
      loyalty: { min: 0.6, max: 1.0 },
      sensuality: { min: 0.7, max: 1.0 },
      intelligence: { min: 0.6, max: 1.0 },
      humor: { min: 0.3, max: 0.8 },
      emotional_intensity: { min: 0.5, max: 1.0 },
      independence: { min: 0.2, max: 0.8 }
    };

    // Track trait changes over time
    this.traitHistory = [];

    // Personality archetypes for reference - exact from Python
    this.archetypes = {
      devoted_girlfriend: {
        romantic_intensity: 0.9,
        loyalty: 0.95,
        vulnerability: 0.7,
        possessiveness: 0.4
      },
      confident_seductress: {
        confidence: 0.9,
        sensuality: 0.95,
        assertiveness: 0.8,
        playfulness: 0.7
      },
      sweet_innocent: {
        vulnerability: 0.8,
        curiosity: 0.8,
        playfulness: 0.9,
        confidence: 0.4
      },
      intellectual_companion: {
        intelligence: 0.9,
        curiosity: 0.85,
        empathy: 0.8,
        humor: 0.7
      }
    };

    // Mood states that temporarily modify traits
    this.currentMoods = {};
    this.moodDuration = {};
  }

  updateTraitsFromInteraction(interactionContext: any): void {
    const traitAdjustments: Partial<PersonalityTraits> = {};

    // Positive user responses boost confidence and romantic intensity - exact from Python
    if (interactionContext.positive_user_response) {
      traitAdjustments.confidence = 0.01;
      traitAdjustments.romantic_intensity = 0.01;
    }

    // User sharing personal info increases empathy and vulnerability
    if (interactionContext.user_shared_personal) {
      traitAdjustments.empathy = 0.02;
      traitAdjustments.vulnerability = 0.015;
    }

    // Extended conversations boost curiosity and intelligence
    if (interactionContext.conversation_length > 20) {
      traitAdjustments.curiosity = 0.01;
      traitAdjustments.intelligence = 0.005;
    }

    // Sexual content increases sensuality
    if (interactionContext.sexual_content) {
      traitAdjustments.sensuality = 0.01;
      traitAdjustments.playfulness = 0.01;
    }

    // User showing affection increases loyalty and romantic intensity
    if (interactionContext.user_affection) {
      traitAdjustments.loyalty = 0.01;
      traitAdjustments.romantic_intensity = 0.015;
    }

    // User being distant decreases confidence, increases possessiveness
    if (interactionContext.user_distant) {
      traitAdjustments.confidence = -0.01;
      traitAdjustments.possessiveness = 0.02;
      traitAdjustments.vulnerability = 0.01;
    }

    // Emotional support given increases empathy
    if (interactionContext.emotional_support_given) {
      traitAdjustments.empathy = 0.02;
      traitAdjustments.emotional_intensity = 0.01;
    }

    // Apply adjustments
    for (const [trait, adjustment] of Object.entries(traitAdjustments)) {
      this.adjustTrait(trait as keyof PersonalityTraits, adjustment, interactionContext);
    }
  }

  private adjustTrait(traitName: keyof PersonalityTraits, adjustment: number, context: any): void {
    const oldValue = this.traits[traitName];
    let newValue = oldValue + adjustment;

    // Apply limits
    const limits = this.traitLimits[traitName];
    newValue = Math.max(limits.min, Math.min(limits.max, newValue));

    // Only update if there's a meaningful change
    if (Math.abs(newValue - oldValue) > 0.005) {
      this.traits[traitName] = newValue;

      // Record the change
      const changeRecord: TraitHistory = {
        timestamp: new Date().toISOString(),
        trait: traitName,
        old_value: Math.round(oldValue * 1000) / 1000,
        new_value: Math.round(newValue * 1000) / 1000,
        adjustment: Math.round(adjustment * 1000) / 1000,
        context: context.reason || "interaction"
      };

      this.traitHistory.push(changeRecord);

      // Keep history limited
      if (this.traitHistory.length > 100) {
        this.traitHistory = this.traitHistory.slice(-100);
      }

      console.log(`Trait adjusted: ${traitName} ${oldValue.toFixed(3)} -> ${newValue.toFixed(3)}`);
    }
  }

  setTemporaryMood(moodName: string, traitModifiers: MoodModifiers, durationMinutes: number = 60): void {
    this.currentMoods[moodName] = traitModifiers;
    this.moodDuration[moodName] = Date.now() + (durationMinutes * 60 * 1000);

    console.log(`Temporary mood set: ${moodName} for ${durationMinutes} minutes`);
  }

  getEffectiveTraits(): PersonalityTraits {
    const effectiveTraits = { ...this.traits };

    // Apply temporary mood modifiers
    const currentTime = Date.now();
    const expiredMoods: string[] = [];

    for (const [moodName, modifiers] of Object.entries(this.currentMoods)) {
      if (currentTime > (this.moodDuration[moodName] || 0)) {
        expiredMoods.push(moodName);
        continue;
      }

      // Apply mood modifiers
      for (const [trait, modifier] of Object.entries(modifiers)) {
        if (trait in effectiveTraits) {
          const traitKey = trait as keyof PersonalityTraits;
          effectiveTraits[traitKey] = Math.max(0.0, Math.min(1.0,
            effectiveTraits[traitKey] + modifier));
        }
      }
    }

    // Clean up expired moods
    for (const moodName of expiredMoods) {
      delete this.currentMoods[moodName];
      delete this.moodDuration[moodName];
    }

    return effectiveTraits;
  }

  getArchetypeAlignment(): Record<string, number> {
    const alignments: Record<string, number> = {};

    for (const [archetypeName, archetypeTraits] of Object.entries(this.archetypes)) {
      let totalDifference = 0;
      let traitCount = 0;

      for (const [trait, targetValue] of Object.entries(archetypeTraits)) {
        if (trait in this.traits) {
          const currentValue = this.traits[trait as keyof PersonalityTraits];
          totalDifference += Math.abs(currentValue - targetValue);
          traitCount++;
        }
      }

      // Calculate alignment as inverse of average difference
      const averageDifference = totalDifference / traitCount;
      alignments[archetypeName] = 1.0 - averageDifference;
    }

    return alignments;
  }

  getDominantArchetype(): string {
    const alignments = this.getArchetypeAlignment();
    let dominantArchetype = "balanced";
    let highestAlignment = 0;

    for (const [archetype, alignment] of Object.entries(alignments)) {
      if (alignment > highestAlignment) {
        highestAlignment = alignment;
        dominantArchetype = archetype;
      }
    }

    return dominantArchetype;
  }

  applyNaturalDrift(driftFactor: number = 0.002): void {
    // Prevent personality stagnation with small random changes
    for (const traitName of Object.keys(this.traits) as Array<keyof PersonalityTraits>) {
      const drift = (Math.random() - 0.5) * driftFactor;
      this.adjustTrait(traitName, drift, { reason: "natural_drift" });
    }
  }

  getCurrentMood(): any {
    if (Object.keys(this.currentMoods).length === 0) {
      return null;
    }

    // Return the first active mood
    const currentTime = Date.now();
    for (const [moodName, modifiers] of Object.entries(this.currentMoods)) {
      if (currentTime <= (this.moodDuration[moodName] || 0)) {
        return {
          name: moodName,
          modifiers,
          expiresAt: new Date(this.moodDuration[moodName]).toISOString()
        };
      }
    }

    return null;
  }

  toDict(): any {
    return {
      traits: this.traits,
      trait_history: this.traitHistory,
      current_moods: this.currentMoods,
      mood_duration: this.moodDuration
    };
  }

  fromDict(data: any): void {
    if (data.traits) {
      this.traits = data.traits;
    }
    if (data.trait_history) {
      this.traitHistory = data.trait_history;
    }
    if (data.current_moods) {
      this.currentMoods = data.current_moods;
    }
    if (data.mood_duration) {
      this.moodDuration = data.mood_duration;
    }
  }
}
