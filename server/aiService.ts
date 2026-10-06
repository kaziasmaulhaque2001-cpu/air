import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { BusinessKnowledge, ReplyRule, AiSettings, Message, Conversation, ServicePriceItem } from './types.js';

export interface GenerateReplyParams {
  customerMessage: string;
  conversationId: string;
  customerName?: string;
  username?: string;
  channel?: 'instagram' | 'whatsapp';
  isCommentContext?: boolean; // Requirement 19: Keep DM and Comment contexts strictly separate
}

export interface AiReplyResult {
  replyText: string;
  status: 'success' | 'human_required' | 'fallback';
  triggeredRule?: ReplyRule;
  reason?: string;
  processingTimeMs: number;
}

// Initialize Gemini Client with standard @google/genai SDK
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

export class AiService {
  /**
   * Enforces 100% Roman Banglish script - eliminates any accidental Bengali Unicode characters
   */
  public enforceRomanBanglish(text: string): string {
    if (!/[\u0980-\u09FF]/.test(text)) {
      return text;
    }

    let cleaned = text;

    const banglaReplacements: [RegExp, string][] = [
      [/হ্যাঁ|হ্যা|হেঁ/g, 'Haan'],
      [/অবশ্যই/g, 'obosshoi'],
      [/নমস্কার/g, 'Nomoshkar'],
      [/হ্যালো/g, 'Hello'],
      [/ধন্যবাদ/g, 'Dhonnobad'],
      [/কত|কতো/g, 'koto'],
      [/দাম/g, 'price'],
      [/টাকা/g, 'taka'],
      [/চুল|চুলের/g, 'hair'],
      [/লেন্থ/g, 'length'],
      [/কীভাবে|কিভাবে/g, 'ki vabe'],
      [/সাহায্য|হেল্প/g, 'help'],
      [/করতে|করবো/g, 'korte'],
      [/পারি/g, 'pari'],
      [/আপনার/g, 'apnar'],
      [/আপনি/g, 'apni'],
      [/কাল|আগামীকাল/g, 'kal'],
      [/আজ|আজকে/g, 'aaj'],
      [/সময়|টাইম/g, 'time'],
      [/পাবেন|যাবে/g, 'jabe'],
      [/বলবেন/g, 'bolben'],
      [/ভালো/g, 'bhalo'],
      [/আমাদের/g, 'aamader'],
      [/সেলুন/g, 'salon'],
      [/অফার/g, 'offer'],
      [/ডিসকাউন্ট/g, 'discount'],
      [/ঠিকানা|কোথায়/g, 'Telephone Maidan, Katwa']
    ];

    for (const [pattern, replacement] of banglaReplacements) {
      cleaned = cleaned.replace(pattern, replacement);
    }

    // Strip any lingering Bengali unicode characters
    cleaned = cleaned.replace(/[\u0980-\u09FF]+/g, '').replace(/\s{2,}/g, ' ').trim();

    return cleaned;
  }

  /**
   * Helper to find dynamic service price directly from the latest Business Knowledge
   * Requirement 5, 7 & 10: Dynamically checks database, matches aliases, brands,
   * categories, and query tokens. Returns the current saved price.
   */
  public findServicePrice(
    serviceQuery: string,
    bk: BusinessKnowledge,
    options?: { category?: string; gender?: string }
  ): ServicePriceItem | null {
    const q = serviceQuery.toLowerCase().trim();
    if (!q || !bk.servicePrices) return null;

    let active = bk.servicePrices.filter(sp => sp.isEnabled !== false);

    // Strict category separation between Hair Spa and Hair Straightening
    const isSpaQuery = q.includes('spa');
    const isStraightQuery = q.includes('straight') || q.includes('smooth') || q.includes('smoothen') || q.includes('strex');

    if (isSpaQuery && !options?.category) {
      const spaFiltered = active.filter(sp => sp.category === 'Hair Spa');
      if (spaFiltered.length > 0) active = spaFiltered;
    } else if (isStraightQuery && !options?.category) {
      const straightFiltered = active.filter(sp => sp.category === 'Hair Straightening');
      if (straightFiltered.length > 0) active = straightFiltered;
    }

    if (options?.category) {
      const catLower = options.category.toLowerCase();
      const catFiltered = active.filter(sp => sp.category && sp.category.toLowerCase().includes(catLower));
      if (catFiltered.length > 0) active = catFiltered;
    }

    if (options?.gender) {
      const gLower = options.gender.toLowerCase();
      const genFiltered = active.filter(sp => {
        const sLower = sp.service.toLowerCase();
        if (gLower.includes('lad') || gLower.includes('women')) {
          return sLower.includes('ladies') || sLower.includes('women') || sLower.includes('lady');
        }
        if (gLower.includes('gent') || gLower.includes('men')) {
          return sLower.includes('gents') || sLower.includes('men') || sLower.includes('gent');
        }
        return true;
      });
      if (genFiltered.length > 0) active = genFiltered;
    }

    // 1. Exact match on complete service name
    const exact = active.find(sp => sp.service.toLowerCase() === q);
    if (exact) return exact;

    // 2. Exact match on aliases
    const exactAlias = active.find(sp =>
      sp.aliases && sp.aliases.some(a => a.toLowerCase().trim() === q)
    );
    if (exactAlias) return exactAlias;

    // 3. Brand match (e.g. "strex", "loreal", "matrix", "wella", "schwarzkopf")
    const brandMatch = active.find(sp => {
      const b = (sp.brand || '').toLowerCase();
      const s = sp.service.toLowerCase();
      return (b && (q === b || q.includes(b))) || (s.includes('strex') && q.includes('strex'));
    });
    if (brandMatch) return brandMatch;

    // 4. Multi-token match: all words in query exist in complete service name
    const queryTokens = q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
    if (queryTokens.length > 0) {
      const scored = active.map(sp => {
        const fullHaystack = `${sp.service} ${(sp.aliases || []).join(' ')}`.toLowerCase();
        let matchCount = 0;
        for (const token of queryTokens) {
          if (fullHaystack.includes(token)) matchCount++;
        }
        return { sp, matchCount, total: queryTokens.length };
      }).filter(item => item.matchCount === item.total);

      if (scored.length > 0) {
        return scored[0].sp;
      }
    }

    // 5. Query contains service name or service name contains query
    const matched = active.find(sp => {
      const name = sp.service.toLowerCase();
      return name.includes(q) || (q.length > 3 && q.includes(name));
    });
    if (matched) return matched;

    return null;
  }

  /**
   * Finds the exact saved record in Business Knowledge matching the complete Service Name.
   * Does NOT expect or rely on a separate gender database field; inspects the complete Service Name itself.
   */
  public findCompleteServiceByGender(
    serviceKeyword: string,
    gender: 'gents' | 'ladies',
    bk: BusinessKnowledge
  ): ServicePriceItem | null {
    if (!bk.servicePrices) return null;
    const active = bk.servicePrices.filter(sp => sp.isEnabled !== false);
    const kw = serviceKeyword.toLowerCase().trim();

    // 1. Direct search by gender and service keyword in the complete service name
    const match = active.find(sp => {
      const sLower = sp.service.toLowerCase();
      const hasGents = sLower.includes('gents') || sLower.includes('men');
      const hasLadies = sLower.includes('ladies') || sLower.includes('women') || sLower.includes('lady');

      if (gender === 'ladies' && hasLadies && sLower.includes(kw)) {
        return true;
      }
      if (gender === 'gents' && hasGents && sLower.includes(kw)) {
        return true;
      }
      return false;
    });

    if (match) return match;

    // 2. Special cases (e.g. "Strex Smoothing (Ladies Any Length)")
    if (gender === 'ladies' && (kw.includes('smooth') || kw.includes('straight'))) {
      const strex = active.find(sp => sp.service.toLowerCase().includes('strex'));
      if (strex) return strex;
    }

    return null;
  }

  /**
   * Checks whether Business Knowledge contains BOTH a Gents record AND a Ladies record
   * for a service, looking exclusively at the complete Service Name in Business Knowledge.
   * Does NOT expect or rely on a separate gender database field.
   */
  public checkGenderDifferentiatedService(
    queryOrKeyword: string,
    bk: BusinessKnowledge
  ): {
    hasBoth: boolean;
    serviceCategoryOrName: string;
    gentsItem: ServicePriceItem;
    ladiesItem: ServicePriceItem;
    gentsPrice: string;
    ladiesPrice: string;
  } | null {
    if (!bk.servicePrices) return null;
    const active = bk.servicePrices.filter(sp => sp.isEnabled !== false);
    const q = queryOrKeyword.toLowerCase().trim();

    // Candidate salon service keywords
    const candidateKeywords = [
      'botox', 'nanoplastia', 'keratin', 'hair colour', 'hair color',
      'hair cut', 'haircut', 'smoothing', 'straightening', 'smoothening',
      'hair spa', 'spa', 'dandruff'
    ];

    let detectedKw = candidateKeywords.find(k => {
      const reg = new RegExp(`(^|\\s)${k.replace(' ', '\\s+')}(\\s|$)`, 'i');
      return reg.test(q) || q === k || q.includes(k);
    });

    if (!detectedKw) {
      for (const sp of active) {
        const sLower = sp.service.toLowerCase();
        const stripped = sLower.replace(/\b(gents|ladies|men|women|any length|\(|\))\b/gi, '').trim();
        if (stripped.length > 2 && (q === stripped || q.includes(stripped) || stripped.includes(q))) {
          detectedKw = stripped;
          break;
        }
      }
    }

    if (!detectedKw) return null;

    const gentsItem = active.find(sp => {
      const sLower = sp.service.toLowerCase();
      const hasGents = sLower.includes('gents') || sLower.includes('men');
      return hasGents && sLower.includes(detectedKw!);
    });

    const ladiesItem = active.find(sp => {
      const sLower = sp.service.toLowerCase();
      const hasLadies = sLower.includes('ladies') || sLower.includes('women') || sLower.includes('lady');
      return hasLadies && (sLower.includes(detectedKw!) || (detectedKw === 'smoothing' && sLower.includes('strex')));
    });

    if (gentsItem && ladiesItem && gentsItem.price !== ladiesItem.price) {
      return {
        hasBoth: true,
        serviceCategoryOrName: detectedKw,
        gentsItem,
        ladiesItem,
        gentsPrice: gentsItem.price,
        ladiesPrice: ladiesItem.price
      };
    }

    return null;
  }

  /**
   * Checks whether Business Knowledge contains BOTH a Gents record AND a Ladies record
   * for a service, looking exclusively at the complete Service Name.
   */
  public checkServiceHasBothGenders(
    queryOrKeyword: string,
    bk: BusinessKnowledge
  ): {
    hasBoth: boolean;
    gentsItem?: ServicePriceItem;
    ladiesItem?: ServicePriceItem;
    baseName: string;
  } {
    const res = this.checkGenderDifferentiatedService(queryOrKeyword, bk);
    if (res) {
      return {
        hasBoth: true,
        gentsItem: res.gentsItem,
        ladiesItem: res.ladiesItem,
        baseName: res.serviceCategoryOrName
      };
    }
    return { hasBoth: false, baseName: '' };
  }

  /**
   * Check if customer message matches any explicit human takeover trigger
   */
  public isHumanRequested(message: string, aiSettings: AiSettings): boolean {
    const text = message.toLowerCase().trim();
    const keywords = aiSettings.autoHumanKeywords || [
      'human', 'agent', 'staff', 'talk to someone', 'representative', 'real person', 'call me', 'complaint'
    ];
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  }

  /**
   * Match explicit custom reply rules configured in the admin dashboard
   */
  public matchKeywordRule(message: string, rules: ReplyRule[]): ReplyRule | undefined {
    const text = message.toLowerCase().trim();
    const activeRules = rules.filter(r => r.isEnabled).sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      const kw = rule.keyword.toLowerCase().trim();
      if (!kw) continue;

      if (rule.matchType === 'exact') {
        if (text === kw) return rule;
      } else {
        if (text.includes(kw)) return rule;
      }
    }
    return undefined;
  }

  /**
   * Format all 8 Categories of Business Knowledge for dynamic context building
   */
  public buildKnowledgeContext(bk: BusinessKnowledge): string {
    const pricesFormatted = (bk.servicePrices || [])
      .filter(p => p.isEnabled !== false) // Exclude disabled services
      .map(p => {
        const brandStr = p.brand ? ` [Brand: ${p.brand}]` : '';
        const catStr = p.category ? ` [Category: ${p.category}]` : '';
        const genderStr = p.gender ? ` [Applicable: ${p.gender}]` : '';
        const descStr = p.description ? ` (${p.description})` : '';
        const aliasStr = p.aliases && p.aliases.length > 0 ? ` [Aliases: ${p.aliases.join(', ')}]` : '';
        return `• ${p.service}: ${p.price}${brandStr}${catStr}${genderStr}${descStr}${aliasStr}`;
      })
      .join('\n');

    const serviceDetailsFormatted = (bk.serviceDetails || [])
      .map(sd => `• ${sd.service}: ${sd.details}${sd.duration ? ` [Duration: ${sd.duration}]` : ''}${sd.recommendedFor ? ` [Recommended for: ${sd.recommendedFor}]` : ''}`)
      .join('\n');

    const faqsFormatted = (bk.faqs || [])
      .map(f => `Q: ${f.question}\nA: ${f.answer}`)
      .join('\n\n');

    const customKnowledgeFormatted = (bk.customKnowledge || [])
      .map(ck => `• ${ck.topic}: ${ck.information}`)
      .join('\n');

    return `
=== AUTHORITATIVE BUSINESS KNOWLEDGE (SOURCE OF TRUTH) ===
[CATEGORY 1: SERVICES & PRICES]
${pricesFormatted}

[CATEGORY 2: OFFERS & COMBOS]
Special Offers: ${bk.specialOffers || 'Complimentary D-Tan FREE with every facial! Ladies Hair Cut includes FREE Hair Wash + Blow Dry!'}
Active Combos: ${bk.offersAndCombos || 'Special Bridal & Groom packages available on advance consultation.'}

[CATEGORY 3: SALON INFORMATION]
Salon Name: ${bk.businessName}
Description: ${bk.businessDescription}
Location & Address: ${bk.location}
Phone/WhatsApp: ${bk.phoneNumber}
Opening Hours: ${bk.openingHours}
Extended Info: ${bk.salonInfo || 'Premium family salon located at Telephone Maidan, Katwa.'}

[CATEGORY 4: SERVICE DETAILS & BENEFITS]
${serviceDetailsFormatted || 'Botox, Keratin, Nanoplastia, Facials with free D-Tan, Hair Spa, Smoothing, Waxing, Threading, and Nail Extensions.'}

[CATEGORY 5: POLICIES & GUIDELINES]
Booking Policy: ${bk.bookingInformation}
Payment Methods: ${bk.paymentInformation}
Operational Policies: ${bk.policies || 'Advance appointment booking recommended for chemical treatments; walk-ins welcome based on availability.'}
Health & Allergy Notes: ${bk.additionalInformation}

[CATEGORY 6: FREQUENTLY ASKED QUESTIONS]
${faqsFormatted}

[CATEGORY 7: HUMAN HANDOFF PROTOCOL]
${bk.humanHandoffInstructions || 'If customer has medical scalp issues, complaints, unknown services, or requires manager confirmation, politely transfer them to salon staff or offer direct call to ' + bk.phoneNumber + '.'}

[CATEGORY 8: CUSTOM KNOWLEDGE]
${customKnowledgeFormatted || 'Clean, air-conditioned family salon with sanitized tools and gentle kid-friendly haircut options.'}
===========================================================
`;
  }

  /**
   * Core State-Driven Intent & Memory Resolver
   * Resolves follow-ups, pending questions, appointment flow without resetting greetings or hallucinating dates.
   */
  public resolveStateAndIntent(
    rawMessage: string,
    conv: Conversation | undefined,
    history: Message[],
    bk: BusinessKnowledge
  ): {
    replyText?: string;
    updatedState?: Partial<Conversation>;
    detectedIntent?: string;
    needsHuman?: boolean;
    handoffReason?: string;
  } {
    const text = rawMessage.trim().toLowerCase();
    const cleanText = text.replace(/[?!.,;:_]/g, ' ').replace(/\s+/g, ' ').trim();

    // Current persistent conversation context
    const pendingQ = conv?.pendingQuestion;
    const currentTopic = conv?.currentTopic;
    const selectedService = conv?.selectedService;
    const appState = conv?.appointmentState || 'none';
    const appDate = conv?.appointmentDate;
    const appTime = conv?.appointmentTime;

    // Check if this is a follow-up answer to an ongoing conversation
    const isOngoingChat = history.length > 0;

    // ========================================================
    // 1. Follow-up: Correction to Time (e.g., "11 tai", "11:30 tai")
    // ========================================================
    if (
      (text.endsWith('tai') || text.endsWith('tay') || text.endsWith('te')) &&
      (/\b\d{1,2}(:\d{2})?\b/.test(text) || text.includes('11') || text.includes('12') || text.includes('1') || text.includes('2') || text.includes('3') || text.includes('4') || text.includes('5') || text.includes('6') || text.includes('7') || text.includes('8') || text.includes('9') || text.includes('10'))
    ) {
      const cleanTime = rawMessage.trim();
      return {
        replyText: `Ji 😊 ${cleanTime} note kore nilam.`,
        updatedState: {
          appointmentTime: cleanTime,
          appointmentState: 'details_noted',
          pendingQuestion: undefined,
          currentTopic: 'appointment',
          currentIntent: 'time_correction'
        },
        detectedIntent: 'time_correction'
      };
    }

    // ========================================================
    // 2. Follow-up: Answering Time (e.g. "11", "11:00", "11:30", "4 pm", "12 pm", "5 ta")
    // ========================================================
    const isTimeAnswer =
      /^(1[0-2]|[1-9])(:[0-5][0-9])?(\s*(am|pm|ta|tai|te))?$/i.test(text) ||
      text === '11' ||
      text === '11:30' ||
      text === '11 am' ||
      text === '11:00' ||
      text === '12' ||
      text === '4' ||
      text === '5' ||
      text === '10:30';

    if (isTimeAnswer && (pendingQ === 'APPOINTMENT_TIME' || appState === 'date_provided' || appState === 'requesting')) {
      const timeStr = rawMessage.trim();
      const datePrefix = appDate ? `${appDate} ` : '';
      const serviceSuffix = selectedService ? ` ${selectedService}-er request` : ' request';

      return {
        replyText: `Ji 😊 ${datePrefix}${timeStr} tar${serviceSuffix} note korchi.`,
        updatedState: {
          appointmentTime: timeStr,
          appointmentState: 'details_noted',
          pendingQuestion: undefined,
          currentTopic: 'appointment',
          currentIntent: 'appointment_time_provided'
        },
        detectedIntent: 'appointment_time_provided'
      };
    }

    // ========================================================
    // 3. Follow-up: Answering Date (e.g. "Kal", "Kalke", "Aj", "Ajke", "Tomorrow", "Today", "Saturday")
    // ========================================================
    const isDateAnswer =
      /^(kal|kalke|aj|ajke|today|tomorrow|sombar|mongolbar|budhbar|brihoshpotibar|shukrobar|shonibar|robibar|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text);

    if (isDateAnswer && (pendingQ === 'APPOINTMENT_DATE_OR_TIME' || pendingQ === 'APPOINTMENT_DATE' || appState === 'requesting')) {
      const dateStr = text === 'kal' || text === 'kalke' ? 'Kal' : text === 'aj' || text === 'ajke' ? 'Aaj' : rawMessage.trim();
      return {
        replyText: `Ji 😊 ${dateStr} kon time prefer korben?`,
        updatedState: {
          appointmentDate: dateStr,
          appointmentState: 'date_provided',
          pendingQuestion: 'APPOINTMENT_TIME',
          currentTopic: 'appointment',
          currentIntent: 'appointment_date_provided'
        },
        detectedIntent: 'appointment_date_provided'
      };
    }

    // ========================================================
    // 4. Follow-up: Gender Selection (e.g. "Men", "Gents", "Boy", "Ladies", "Women", "Girl")
    // ========================================================
    const hasMenExplicit = /\b(gents|gent|men|man|boy|male|purush|chele|bhai)\b/i.test(cleanText);
    const hasLadiesExplicit = /\b(ladies|lady|women|woman|girl|female|mohila|meye)\b/i.test(cleanText);

    // Check message history for previously declared gender in this conversation
    let priorHistoryGender: 'gents' | 'ladies' | undefined;
    if (history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.direction === 'inbound' || msg.senderId !== 'bot') {
          const txt = (msg.messageText || '').toLowerCase();
          const hasM = /\b(gents|gent|men|man|boy|male|purush|chele|bhai)\b/i.test(txt);
          const hasL = /\b(ladies|lady|women|woman|girl|female|mohila|meye)\b/i.test(txt);
          if (hasL && !hasM) {
            priorHistoryGender = 'ladies';
            break;
          } else if (hasM && !hasL) {
            priorHistoryGender = 'gents';
            break;
          }
        }
      }
    }

    // Gender Rule:
    // 1. Explicit gender in current message = use it.
    // 2. If no current gender but valid conversation context has gender = use that.
    // 3. Otherwise undefined (must ask before giving differentiated prices).
    const effectiveGender: 'gents' | 'ladies' | undefined =
      hasMenExplicit && !hasLadiesExplicit ? 'gents' :
      hasLadiesExplicit && !hasMenExplicit ? 'ladies' :
      (conv?.gender === 'gents' || conv?.gender === 'ladies' ? conv.gender : priorHistoryGender);

    const isMenStandalone = /^(men|gent|gents|boy|male|purush|chele|bhai|gents hair cut|men haircut)$/i.test(cleanText);
    const isLadiesStandalone = /^(women|ladies|lady|girl|female|mohila|meye|ladies hair cut|women haircut)$/i.test(cleanText);

    if (isMenStandalone || isLadiesStandalone) {
      const answeredGender: 'gents' | 'ladies' = isMenStandalone ? 'gents' : 'ladies';
      const priorService = (selectedService || currentTopic || '').toLowerCase();

      // Case A: Prior service was Botox
      if (priorService.includes('botox')) {
        if (answeredGender === 'ladies') {
          const lBotox = this.findServicePrice('Ladies Botox', bk)?.price || '₹2799';
          return {
            replyText: `Ladies Botox ${lBotox} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Botox', currentTopic: 'botox', pendingQuestion: undefined },
            detectedIntent: 'ladies_botox_price'
          };
        } else {
          const gBotox = this.findServicePrice('Gents Botox', bk)?.price || '₹1199';
          return {
            replyText: `Gents Botox ${gBotox} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Botox', currentTopic: 'botox', pendingQuestion: undefined },
            detectedIntent: 'gents_botox_price'
          };
        }
      }

      // Case B: Prior service was Nanoplastia
      if (priorService.includes('nanoplastia')) {
        if (answeredGender === 'ladies') {
          const lNano = this.findServicePrice('Ladies Nanoplastia', bk)?.price || '₹3799';
          return {
            replyText: `Ladies Nanoplastia ${lNano} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Nanoplastia', currentTopic: 'nanoplastia', pendingQuestion: undefined },
            detectedIntent: 'ladies_nanoplastia_price'
          };
        } else {
          const gNano = this.findServicePrice('Gents Nanoplastia', bk)?.price || '₹1999';
          return {
            replyText: `Gents Nanoplastia ${gNano} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Nanoplastia', currentTopic: 'nanoplastia', pendingQuestion: undefined },
            detectedIntent: 'gents_nanoplastia_price'
          };
        }
      }

      // Case C: Prior service was Keratin
      if (priorService.includes('keratin')) {
        if (answeredGender === 'ladies') {
          const lKeratin = this.findServicePrice('Ladies Keratin', bk)?.price || '₹2999';
          return {
            replyText: `Ladies Keratin ${lKeratin} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Keratin', currentTopic: 'keratin', pendingQuestion: undefined },
            detectedIntent: 'ladies_keratin_price'
          };
        } else {
          const gKeratin = this.findServicePrice('Gents Keratin', bk)?.price || '₹1299';
          return {
            replyText: `Gents Keratin ${gKeratin} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Keratin', currentTopic: 'keratin', pendingQuestion: undefined },
            detectedIntent: 'gents_keratin_price'
          };
        }
      }

      // Case D: Prior service was Hair Straightening
      if (priorService.includes('straight') || priorService.includes('smooth')) {
        if (answeredGender === 'ladies') {
          const strexItem = this.findServicePrice('Strex Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Strex', bk);
          const lorealItem = this.findServicePrice('Loreal Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Loreal', bk, { category: 'Hair Straightening' });
          const matrixItem = this.findServicePrice('Matrix Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Matrix', bk, { category: 'Hair Straightening' });
          const schwarzkopfItem = this.findServicePrice('Schwarzkopf Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Straightening' });
          const wellaItem = this.findServicePrice('Wella Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Wella', bk, { category: 'Hair Straightening' });

          const strexPrice = strexItem?.price || '₹2199';
          const lorealPrice = lorealItem?.price || '₹3199';
          const matrixPrice = matrixItem?.price || '₹3499';
          const schwarzkopfPrice = schwarzkopfItem?.price || '₹3799';
          const wellaPrice = wellaItem?.price || '₹3999';

          return {
            replyText: `Ladies Hair Straightening (Any Length): Strex ${strexPrice}, Loreal ${lorealPrice}, Matrix ${matrixPrice}, Schwarzkopf ${schwarzkopfPrice}, Wella ${wellaPrice} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Straightening', currentTopic: 'hair_straightening', pendingQuestion: undefined },
            detectedIntent: 'ladies_hair_straightening_price'
          };
        } else {
          const gStraightItem = this.findServicePrice('Gents Hair Straightening', bk);
          const gStraightPrice = gStraightItem?.price || '₹999';
          return {
            replyText: `Gents Hair Straightening ${gStraightPrice} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Hair Straightening', currentTopic: 'hair_straightening', pendingQuestion: undefined },
            detectedIntent: 'gents_hair_straightening_price'
          };
        }
      }

      // Case E: Prior service was Hair Colour
      if (priorService.includes('colour') || priorService.includes('color')) {
        if (answeredGender === 'ladies') {
          const lColour = this.findServicePrice('Ladies Hair Colour', bk)?.price || '₹1199';
          return {
            replyText: `Ladies Hair Colour ${lColour} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Colour', currentTopic: 'hair_colour', pendingQuestion: undefined },
            detectedIntent: 'ladies_colour_price'
          };
        } else {
          const gColour = this.findServicePrice('Gents Hair Colour', bk)?.price || '₹499';
          return {
            replyText: `Gents Hair Colour ${gColour} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Hair Colour', currentTopic: 'hair_colour', pendingQuestion: undefined },
            detectedIntent: 'gents_colour_price'
          };
        }
      }

      // Case F: Prior service was Hair Cut
      if (priorService.includes('cut') || pendingQ === 'HAIR_CUT_GENDER' || currentTopic === 'hair_cut') {
        if (answeredGender === 'ladies') {
          const ladiesCut = this.findServicePrice('Ladies Hair Cut', bk)?.price || '₹249';
          return {
            replyText: `Ladies Hair Cut ${ladiesCut} 😊 Hair Wash + Blow Dry free thakbe.`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Cut', currentTopic: 'hair_cut', pendingQuestion: undefined },
            detectedIntent: 'ladies_haircut_price'
          };
        } else {
          const gentCut = this.findServicePrice('Gents Hair Cut', bk)?.price || '₹99';
          return {
            replyText: `Gents Hair Cut ${gentCut} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Hair Cut', currentTopic: 'hair_cut', pendingQuestion: undefined },
            detectedIntent: 'gents_haircut_price'
          };
        }
      }

      // Case G: Prior service was Hair Spa
      if (priorService.includes('spa') || pendingQ === 'HAIR_SPA_GENDER' || currentTopic === 'hair_spa') {
        if (answeredGender === 'ladies') {
          const lSmooth = this.findServicePrice('Loreal Smooth', bk)?.price || '₹799';
          const lRepair = this.findServicePrice('Loreal Repair', bk)?.price || '₹849';
          const lWella = this.findServicePrice('Wella', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1099';
          const lSchwarzkopf = this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1299';
          const lOil = this.findServicePrice('Oil Reflection', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1699';
          const lFusion = this.findServicePrice('Fushion', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1999';
          return {
            replyText: `Ladies Hair Spa (Any Length): Loreal Smooth ${lSmooth}, Loreal Repair ${lRepair}, Wella ${lWella}, Schwarzkopf ${lSchwarzkopf}, Oil Reflection ${lOil}, Fushion ${lFusion} 😊`,
            updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Spa', currentTopic: 'hair_spa', pendingQuestion: undefined },
            detectedIntent: 'ladies_hair_spa_price'
          };
        } else {
          const gLoreal = this.findServicePrice('Loreal', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹399';
          const gMatrix = this.findServicePrice('Matrix', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹449';
          const gWella = this.findServicePrice('Wella', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹499';
          const gSchwarzkopf = this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹499';
          const gOil = this.findServicePrice('Oil Reflection', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹549';
          const gFusion = this.findServicePrice('Fushion', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹599';
          return {
            replyText: `Gents Hair Spa: Loreal ${gLoreal}, Matrix ${gMatrix}, Wella ${gWella}, Schwarzkopf ${gSchwarzkopf}, Oil Reflection ${gOil}, Fushion ${gFusion} 😊`,
            updatedState: { gender: 'gents', selectedService: 'Gents Hair Spa', currentTopic: 'hair_spa', pendingQuestion: undefined },
            detectedIntent: 'gents_hair_spa_price'
          };
        }
      }

      // Case H: Dynamic custom service stored in selectedService
      if (selectedService) {
        const dynG = answeredGender === 'gents' ? 'gents' : 'ladies';
        const dynMatch = this.findServicePrice(selectedService, bk, { gender: dynG });
        if (dynMatch) {
          return {
            replyText: `${dynMatch.service} ${dynMatch.price} 😊`,
            updatedState: { gender: answeredGender, selectedService: dynMatch.service, pendingQuestion: undefined },
            detectedIntent: 'dynamic_gender_price'
          };
        }
      }

      // Case I: No prior service - customer declared gender first (e.g. "Ladies" or "Gents")
      return {
        replyText: 'Ji 😊 Kon service ta jante chacchen?',
        updatedState: {
          gender: answeredGender,
          pendingQuestion: 'SERVICE_SELECTION'
        },
        detectedIntent: 'gender_stated_first'
      };
    }

    // ========================================================
    // 6. Fruit Facial (Requirement 24: Test 2)
    // ========================================================
    if (text.includes('fruit facial') || text === 'fruit facial' || text === 'fruit facial price') {
      const ffPrice = this.findServicePrice('Fruit Facial', bk)?.price || '₹999';
      return {
        replyText: `Fruit Facial ${ffPrice} 😊`,
        updatedState: {
          selectedService: 'Fruit Facial',
          currentTopic: 'facial',
          pendingQuestion: undefined,
          currentIntent: 'fruit_facial_price'
        },
        detectedIntent: 'fruit_facial_price'
      };
    }

    // ========================================================
    // 7. Appointment Request (Requirement 7, 23 & 24)
    // AI MUST NOT invent: "Kal appointment neya jabe."
    // Correct: "Obosshoi 😊 Kon din ar kon time prefer korben?"
    // If selected service exists: "Obosshoi 😊 Fruit Facial-er jonno kon din ar kon time prefer korben?"
    // ========================================================
    const isAppointmentReq =
      text === 'appointment' ||
      text === 'appointment book' ||
      text === 'booking' ||
      text === 'book korte chai' ||
      text === 'appointment nibo' ||
      text === 'slot chai' ||
      text.includes('appointment book') ||
      text.includes('booking korte chai');

    if (isAppointmentReq) {
      const serviceContext = selectedService ? `${selectedService}-er jonno ` : '';
      return {
        replyText: `Obosshoi 😊 ${serviceContext}kon din ar kon time prefer korben?`,
        updatedState: {
          appointmentState: 'requesting',
          pendingQuestion: 'APPOINTMENT_DATE_OR_TIME',
          currentTopic: 'appointment',
          currentIntent: 'request_appointment'
        },
        detectedIntent: 'request_appointment'
      };
    }

    // ========================================================
    // 8. Hair Cut Request (Requirement: Ask Gents na Ladies? if not established)
    // ========================================================
    const hasHaircut =
      cleanText.includes('hair cut') ||
      cleanText.includes('haircut') ||
      cleanText.includes('hair cutting') ||
      cleanText.includes('chul kata') ||
      cleanText.includes('cutting') ||
      cleanText.includes('chul katbo');

    if (hasHaircut) {
      const gCutPrice = this.findServicePrice('Gents Hair Cut', bk)?.price || '₹99';
      const lCutPrice = this.findServicePrice('Ladies Hair Cut', bk)?.price || '₹249';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Hair Cut ${gCutPrice} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Hair Cut', currentTopic: 'hair_cut', pendingQuestion: undefined },
          detectedIntent: 'gents_haircut_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Hair Cut ${lCutPrice} 😊 Hair Wash + Blow Dry free thakbe.`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Cut', currentTopic: 'hair_cut', pendingQuestion: undefined },
          detectedIntent: 'ladies_haircut_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          currentTopic: 'hair_cut',
          selectedService: 'Hair Cut',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'haircut_gender_clarification'
        },
        detectedIntent: 'haircut_gender_clarification'
      };
    }

    // ========================================================
    // 9. Botox Intent (Ask Gents na Ladies? if not established)
    // ========================================================
    if (cleanText.includes('botox')) {
      const gBotox = this.findServicePrice('Gents Botox', bk)?.price || '₹1199';
      const lBotox = this.findServicePrice('Ladies Botox', bk)?.price || '₹2799';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Botox ${gBotox} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Botox', currentTopic: 'botox', pendingQuestion: undefined },
          detectedIntent: 'gents_botox_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Botox ${lBotox} 😊`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Botox', currentTopic: 'botox', pendingQuestion: undefined },
          detectedIntent: 'ladies_botox_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Botox',
          currentTopic: 'botox',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'botox_gender_clarification'
        },
        detectedIntent: 'botox_gender_clarification'
      };
    }

    // ========================================================
    // 10. Keratin Intent (Ask Gents na Ladies? if not established)
    // ========================================================
    if (cleanText.includes('keratin')) {
      const gKeratin = this.findServicePrice('Gents Keratin', bk)?.price || '₹1299';
      const lKeratin = this.findServicePrice('Ladies Keratin', bk)?.price || '₹2999';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Keratin ${gKeratin} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Keratin', currentTopic: 'keratin', pendingQuestion: undefined },
          detectedIntent: 'gents_keratin_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Keratin ${lKeratin} 😊`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Keratin', currentTopic: 'keratin', pendingQuestion: undefined },
          detectedIntent: 'ladies_keratin_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Keratin',
          currentTopic: 'keratin',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'keratin_gender_clarification'
        },
        detectedIntent: 'keratin_gender_clarification'
      };
    }

    // ========================================================
    // 11. Nanoplastia Intent (Ask Gents na Ladies? if not established)
    // ========================================================
    if (cleanText.includes('nanoplastia')) {
      const gNano = this.findServicePrice('Gents Nanoplastia', bk)?.price || '₹1999';
      const lNano = this.findServicePrice('Ladies Nanoplastia', bk)?.price || '₹3799';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Nanoplastia ${gNano} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Nanoplastia', currentTopic: 'nanoplastia', pendingQuestion: undefined },
          detectedIntent: 'gents_nanoplastia_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Nanoplastia ${lNano} 😊`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Nanoplastia', currentTopic: 'nanoplastia', pendingQuestion: undefined },
          detectedIntent: 'ladies_nanoplastia_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Nanoplastia',
          currentTopic: 'nanoplastia',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'nanoplastia_gender_clarification'
        },
        detectedIntent: 'nanoplastia_gender_clarification'
      };
    }

    // ========================================================
    // 12. Hair Straightening Intent (Ask Gents na Ladies? if not established)
    // Official Category Name: HAIR STRAIGHTENING
    // Aliases: Hair Smoothing, Smoothing, Smoothening, Straightening
    // ========================================================
    const hasStraightening =
      cleanText.includes('straightening') ||
      cleanText.includes('smoothing') ||
      cleanText.includes('smoothening') ||
      cleanText.includes('chul straight') ||
      cleanText.includes('strex');

    if (hasStraightening) {
      const strexItem = this.findServicePrice('Strex Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Strex', bk);
      const strexPrice = strexItem?.price || '₹2199';

      // Specific Strex query (Strex is explicitly Ladies Any Length straightening)
      if (cleanText.includes('strex')) {
        return {
          replyText: `Strex Hair Straightening ${strexPrice} 😊`,
          updatedState: { selectedService: strexItem?.service || 'Strex Hair Straightening', currentTopic: 'hair_straightening', pendingQuestion: undefined },
          detectedIntent: 'strex_straightening_price'
        };
      }

      const lorealPrice = (this.findServicePrice('Loreal Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Loreal', bk, { category: 'Hair Straightening' }))?.price || '₹3199';
      const matrixPrice = (this.findServicePrice('Matrix Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Matrix', bk, { category: 'Hair Straightening' }))?.price || '₹3499';
      const schwarzkopfPrice = (this.findServicePrice('Schwarzkopf Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Straightening' }))?.price || '₹3799';
      const wellaPrice = (this.findServicePrice('Wella Hair Straightening', bk, { category: 'Hair Straightening' }) || this.findServicePrice('Wella', bk, { category: 'Hair Straightening' }))?.price || '₹3999';
      const gentsStraightPrice = this.findServicePrice('Gents Hair Straightening', bk)?.price || '₹999';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Hair Straightening ${gentsStraightPrice} 😊`,
          updatedState: { selectedService: 'Gents Hair Straightening', gender: 'gents', currentTopic: 'hair_straightening', pendingQuestion: undefined },
          detectedIntent: 'gents_straightening_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Hair Straightening (Any Length): Strex ${strexPrice}, Loreal ${lorealPrice}, Matrix ${matrixPrice}, Schwarzkopf ${schwarzkopfPrice}, Wella ${wellaPrice} 😊`,
          updatedState: { selectedService: 'Ladies Hair Straightening', gender: 'ladies', currentTopic: 'hair_straightening', pendingQuestion: undefined },
          detectedIntent: 'ladies_straightening_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Hair Straightening',
          currentTopic: 'hair_straightening',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'straightening_gender_clarification'
        },
        detectedIntent: 'straightening_gender_clarification'
      };
    }

    // ========================================================
    // 13. Hair Colour Intent (Ask Gents na Ladies? if not established)
    // ========================================================
    const isHairColour =
      cleanText.includes('hair colour') ||
      cleanText.includes('hair color') ||
      cleanText.includes('chul colour') ||
      cleanText.includes('chul color') ||
      cleanText.includes('colour koto') ||
      cleanText.includes('color koto') ||
      cleanText.includes('colour price') ||
      cleanText.includes('color price') ||
      cleanText === 'hair colour' ||
      cleanText === 'hair color' ||
      cleanText === 'hair colouring';

    if (isHairColour) {
      const gColour = this.findServicePrice('Gents Hair Colour', bk)?.price || '₹499';
      const lColour = this.findServicePrice('Ladies Hair Colour', bk)?.price || '₹1199';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Hair Colour ${gColour} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Hair Colour', currentTopic: 'hair_colour', pendingQuestion: undefined },
          detectedIntent: 'gents_colour_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Hair Colour ${lColour} 😊`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Colour', currentTopic: 'hair_colour', pendingQuestion: undefined },
          detectedIntent: 'ladies_colour_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Hair Colour',
          currentTopic: 'hair_colour',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'colour_gender_clarification'
        },
        detectedIntent: 'colour_gender_clarification'
      };
    }

    // ========================================================
    // 14. Hair Spa Intent (Ask Gents na Ladies? if not established)
    // ========================================================
    const isHairSpa =
      cleanText.includes('hair spa') ||
      cleanText === 'spa' ||
      cleanText === 'hair spa' ||
      cleanText === 'spa price' ||
      cleanText === 'hair spa price' ||
      cleanText === 'spa koto' ||
      cleanText === 'hair spa koto';

    if (isHairSpa) {
      const gLoreal = this.findServicePrice('Loreal', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹399';
      const gMatrix = this.findServicePrice('Matrix', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹449';
      const gWella = this.findServicePrice('Wella', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹499';
      const gSchwarzkopf = this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹499';
      const gOil = this.findServicePrice('Oil Reflection', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹549';
      const gFusion = this.findServicePrice('Fushion', bk, { category: 'Hair Spa', gender: 'Gents' })?.price || '₹599';

      const lSmooth = this.findServicePrice('Loreal Smooth', bk)?.price || '₹799';
      const lRepair = this.findServicePrice('Loreal Repair', bk)?.price || '₹849';
      const lWella = this.findServicePrice('Wella', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1099';
      const lSchwarzkopf = this.findServicePrice('Schwarzkopf', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1299';
      const lOil = this.findServicePrice('Oil Reflection', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1699';
      const lFusion = this.findServicePrice('Fushion', bk, { category: 'Hair Spa', gender: 'Ladies Any Length' })?.price || '₹1999';

      if (effectiveGender === 'gents') {
        return {
          replyText: `Gents Hair Spa: Loreal ${gLoreal}, Matrix ${gMatrix}, Wella ${gWella}, Schwarzkopf ${gSchwarzkopf}, Oil Reflection ${gOil}, Fushion ${gFusion} 😊`,
          updatedState: { gender: 'gents', selectedService: 'Gents Hair Spa', currentTopic: 'hair_spa', pendingQuestion: undefined },
          detectedIntent: 'gents_hair_spa_price'
        };
      }

      if (effectiveGender === 'ladies') {
        return {
          replyText: `Ladies Hair Spa (Any Length): Loreal Smooth ${lSmooth}, Loreal Repair ${lRepair}, Wella ${lWella}, Schwarzkopf ${lSchwarzkopf}, Oil Reflection ${lOil}, Fushion ${lFusion} 😊`,
          updatedState: { gender: 'ladies', selectedService: 'Ladies Hair Spa', currentTopic: 'hair_spa', pendingQuestion: undefined },
          detectedIntent: 'ladies_hair_spa_price'
        };
      }

      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: 'Hair Spa',
          currentTopic: 'hair_spa',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'hair_spa_gender_clarification'
        },
        detectedIntent: 'hair_spa_gender_clarification'
      };
    }

    // ========================================================
    // 15. Dynamic Gender-Differentiated Service Check
    // For any custom service added in Business Knowledge where Gents and Ladies have different prices
    // ========================================================
    const dynGenderMatch = this.checkGenderDifferentiatedService(cleanText, bk);
    if (dynGenderMatch) {
      if (effectiveGender === 'gents') {
        return {
          replyText: `${dynGenderMatch.gentsItem.service} ${dynGenderMatch.gentsPrice} 😊`,
          updatedState: { gender: 'gents', selectedService: dynGenderMatch.gentsItem.service, currentTopic: 'service_pricing', pendingQuestion: undefined },
          detectedIntent: 'dynamic_gents_service_price'
        };
      }
      if (effectiveGender === 'ladies') {
        return {
          replyText: `${dynGenderMatch.ladiesItem.service} ${dynGenderMatch.ladiesPrice} 😊`,
          updatedState: { gender: 'ladies', selectedService: dynGenderMatch.ladiesItem.service, currentTopic: 'service_pricing', pendingQuestion: undefined },
          detectedIntent: 'dynamic_ladies_service_price'
        };
      }
      // Neither established: Ask Gents na Ladies?
      return {
        replyText: 'Ji 😊 Gents na Ladies?',
        updatedState: {
          selectedService: dynGenderMatch.serviceCategoryOrName,
          currentTopic: 'service_pricing',
          pendingQuestion: 'GENDER_CLARIFICATION',
          currentIntent: 'dynamic_gender_clarification'
        },
        detectedIntent: 'dynamic_gender_clarification'
      };
    }

    // ========================================================
    // 16. Dynamic Single-Service Price Lookup (Requirement 10: Dynamic Knowledge Test)
    // Works for ANY service added in Business Knowledge (e.g. "TEST SERVICE" = ₹1234 -> ₹5678, Facials, D-Tan, Waxing, etc.)
    // ========================================================
    const testMatch = (bk.servicePrices || [])
      .filter(sp => sp.isEnabled !== false)
      .find(sp => {
        const sName = sp.service.toLowerCase();
        const hasAlias = sp.aliases && sp.aliases.some(a => {
          const al = a.toLowerCase();
          return cleanText === al || cleanText === `${al} price` || cleanText === `what is ${al} price` || cleanText === `${al} price koto` || cleanText === `${al} koto` || cleanText.includes(al);
        });
        return (
          cleanText === sName ||
          cleanText === `${sName} price` ||
          cleanText === `what is ${sName} price` ||
          cleanText === `price of ${sName}` ||
          cleanText === `${sName} koto` ||
          cleanText === `${sName} price koto` ||
          cleanText.includes(sName) ||
          Boolean(hasAlias)
        );
      });

    if (testMatch) {
      return {
        replyText: `${testMatch.service} ${testMatch.price} 😊`,
        updatedState: {
          selectedService: testMatch.service,
          pendingQuestion: undefined,
          currentTopic: 'service_pricing',
          currentIntent: 'dynamic_service_price'
        },
        detectedIntent: 'dynamic_service_price'
      };
    }

    // ========================================================
    // 17. Unknown Service Check (Requirement 18 & 26: Test 4)
    // If customer asks for something completely unavailable in Business Knowledge
    // (e.g. tattoo, laser hair removal, body piercing), do NOT hallucinate!
    // ========================================================
    const unknownServices = [
      'tattoo', 'laser', 'piercing', 'surgery', 'fillers', 'dental', 'hair transplant'
    ];
    if (unknownServices.some(u => text.includes(u))) {
      return {
        replyText: 'Ji 😊 Eita niye ami fully confirm korte parchi na. Apnake amader team-er sathe connect kore dichhi.',
        needsHuman: true,
        handoffReason: `Customer enquired about unknown service: ${rawMessage}`,
        detectedIntent: 'unknown_service_handoff'
      };
    }

    // ========================================================
    // 13. Offers & Combos (Requirement 25: Test 3)
    // ========================================================
    const isOfferQuery =
      text === 'offer' ||
      text === 'offers' ||
      text.includes('offer ache') ||
      text.includes('offer aache') ||
      text.includes('offers ache') ||
      text.includes('any offer') ||
      text.includes('special offer') ||
      text.includes('discount') ||
      text.includes('combo') ||
      /^(offers?|discounts?|combos?)\b/i.test(text);

    if (isOfferQuery) {
      const offerText = bk.specialOffers || 'Shob facial-er sathe D-Tan completely FREE! Ar Ladies Hair Cut-er sathe Hair Wash + Blow Dry FREE ✨';
      return {
        replyText: `${offerText} 😊`,
        updatedState: { currentTopic: 'offers', pendingQuestion: undefined },
        detectedIntent: 'offers_query'
      };
    }

    // ========================================================
    // 14. Location & Address (Requirement 25: Test 3)
    // ========================================================
    if (text.includes('location') || text.includes('kothay') || text.includes('where') || text.includes('address') || text.includes('thikana')) {
      const loc = bk.location || 'Telephone Maidan, Katwa';
      return {
        replyText: `Aamader salon ${loc}-te 📍 Visit korte paren!`,
        updatedState: { currentTopic: 'location', pendingQuestion: undefined },
        detectedIntent: 'location_query'
      };
    }

    // ========================================================
    // 15. Salon Opening Hours & Timing
    // ========================================================
    if (text.includes('timing') || text.includes('time') || text.includes('open') || text.includes('close') || text.includes('khola')) {
      if (!isTimeAnswer) {
        const hours = bk.openingHours || 'Monday - Sunday: 10:00 AM - 9:00 PM';
        return {
          replyText: `Aamader salon ${hours} open thake 😊`,
          updatedState: { currentTopic: 'timing', pendingQuestion: undefined },
          detectedIntent: 'timing_query'
        };
      }
    }

    // ========================================================
    // 16. Greetings (Requirement 5 & 23: NEVER reset chat if ongoing!)
    // ========================================================
    if (/^(hi|hello|hey|helo|hy|hii|hiii|nomoshkar|namaste|halo)$/i.test(text)) {
      if (!isOngoingChat || history.length <= 1) {
        return {
          replyText: 'Hi 😊 Ki service niye help lagbe?',
          updatedState: { currentTopic: 'greeting', pendingQuestion: undefined },
          detectedIntent: 'initial_greeting'
        };
      }
      // Ongoing chat: do NOT restart with full greeting bot
      if (pendingQ === 'APPOINTMENT_TIME') {
        return {
          replyText: 'Hi 😊 Kon time prefer korben janale request note kore nebo.',
          detectedIntent: 'greeting_in_progress'
        };
      }
      return {
        replyText: 'Ji 😊 Bolun ki service niye jante chacchen?',
        detectedIntent: 'greeting_in_progress'
      };
    }

    // ========================================================
    // 17. Polite Acknowledgements & Closings (Requirement 5: No greeting reset!)
    // ========================================================
    if (/^(thank you|thanks|thx|dhonnobad|thank u|many thanks)$/i.test(text)) {
      return {
        replyText: "You're most welcome 😊",
        detectedIntent: 'thank_you'
      };
    }
    if (/^(ok|okay|k|thik aache|thik ache|accha|achha|ha|haa|ji)$/i.test(text)) {
      return {
        replyText: 'Ji 😊',
        detectedIntent: 'acknowledgement'
      };
    }

    return {};
  }

  /**
   * Constructs the structured system instruction for Gemini using all 8 categories
   * and strict conversational guidelines.
   */
  public buildGeminiSystemInstruction(
    bk: BusinessKnowledge,
    aiSettings: AiSettings,
    conv?: Conversation,
    ruleHint?: string,
    channel?: 'instagram' | 'whatsapp'
  ): string {
    const knowledgeBlock = this.buildKnowledgeContext(bk);

    const stateBlock = conv ? `
CURRENT CONVERSATION MEMORY:
• Channel: ${channel || conv.channel || 'instagram'}
• Customer Username: ${conv.username}
• Current Topic: ${conv.currentTopic || 'None'}
• Selected Service: ${conv.selectedService || 'None'}
• Pending Question for Customer: ${conv.pendingQuestion || 'None'}
• Appointment State: ${conv.appointmentState || 'none'}
• Appointment Date Noted: ${conv.appointmentDate || 'Not specified'}
• Appointment Time Noted: ${conv.appointmentTime || 'Not specified'}
• Customer Gender: ${conv.gender || 'Not specified'}
` : '';

    const channelName = channel === 'whatsapp' || conv?.channel === 'whatsapp' ? 'WhatsApp Business' : 'Instagram Direct Message';

    return `You are a real, friendly human receptionist at "${bk.businessName}".
Your objective is to reply to incoming customer messages (${channelName}) naturally, concisely, and helpfully.

==================================================
1. LANGUAGE RULES: NATURAL BANGLISH (MANDATORY)
==================================================
- ALWAYS reply in NATURAL BANGLISH (Bengali language written ONLY using English/Roman letters, NEVER Bengali Unicode script).
  - CORRECT: "Haan, obosshoi 😊", "Gents Hair Cut ₹99, Ladies Hair Cut ₹249 😊", "Kon time prefer korben?"
  - FORBIDDEN: বাংলা হরফ (e.g. "হ্যাঁ", "কত", "দাম") are strictly prohibited.
- If customer explicitly requests English ("Please reply in English"), switch to English.

==================================================
2. CONVERSATION MEMORY & NEVER RESET CHAT
==================================================
- You are participating in an ongoing conversation. DO NOT start every message with "Hi" or introduce the salon again if messages have already been exchanged.
- Short follow-up messages (e.g. "Kal", "11", "11 tai", "Men", "Ladies", "Price?") are direct answers to previous questions. Understand them in context!
- If the customer says "11 tai" or "11:30", acknowledge it as a time or correction: "Ji 😊 11 tai note kore nilam."

==================================================
3. NO APPOINTMENT HALLUCINATION
==================================================
- If customer asks for an appointment:
  - Ask: "Obosshoi 😊 Kon din ar kon time prefer korben?"
  - DO NOT say: "Kal appointment neya jabe" or invent dates/availability.
- If customer says "Kal" -> Ask: "Ji 😊 Kal kon time prefer korben?"
- If customer says "11" -> Say: "Ji 😊 Kal 11 tar request ta note korchi."
- NEVER say: "Available", "Slot ache", "Booked", "Confirmed" because slots must be confirmed by salon staff.

==================================================
4. ANSWER ONLY WHAT CUSTOMER NEEDS (NO BUNDLE DUMPING)
==================================================
- If customer asks about ONE service (e.g. "Hair cut price"), answer ONLY about that service:
  "Gents Hair Cut ₹99, Ladies Hair Cut ₹249 😊"
- DO NOT list Hair Spa, Botox, Facials, or other services when asked about a single service!
- Keep replies SHORT (1-2 sentences) like a real Instagram chat.

==================================================
5. DATABASE BUSINESS KNOWLEDGE IS THE SINGLE SOURCE OF TRUTH
==================================================
- The database table below is the ONLY and FINAL authority for all service prices, offers, and details.
- Always quote the exact price listed in the table below.
- If a price has been edited in the database, ALWAYS use that updated value.
- NEVER invent, assume, or guess prices.

==================================================
6. GENDER DIFFERENTIATED PRICING RULE (MANDATORY)
==================================================
- For ANY service where Gents and Ladies have different prices (Botox, Nanoplastia, Keratin, Hair Smoothing, Hair Colour, Hair Cut, Hair Spa, etc.):
  - NEVER guess the gender!
  - NEVER randomly default to Gents or Ladies!
  - If gender is specified in the message or already established earlier in conversation -> quote that gender's price from Business Knowledge directly.
  - If gender is NOT yet established -> ASK: "Ji 😊 Gents na Ladies?" and WAIT for customer's response!
  - Do NOT provide the price until gender is known!

${stateBlock}

${ruleHint ? `SPECIFIC AUTOMATION HINT:\n${ruleHint}\n` : ''}

${knowledgeBlock}
`;
  }

  /**
   * Sanitizes output to strictly purge any Bengali script and ensure Roman Banglish
   */
  public sanitizeOutput(reply: string): string {
    const sanitized = this.enforceRomanBanglish(reply);
    return sanitized;
  }

  /**
   * Validates AI response before sending
   */
  public validateReply(reply: string, isFollowUp: boolean): { isValid: boolean; reason?: string } {
    if (!reply || reply.trim().length === 0) {
      return { isValid: false, reason: 'Empty reply generated' };
    }

    // Check: Zero Bengali Unicode characters allowed
    if (/[\u0980-\u09FF]/.test(reply)) {
      return { isValid: false, reason: 'Bengali script detected - must be in Roman Banglish' };
    }

    const lower = reply.toLowerCase();

    // Check: No system leaks
    if (
      lower.includes('system prompt') ||
      lower.includes('as an ai language model') ||
      lower.includes('gemini') ||
      lower.includes('openai') ||
      lower.includes('category 1') ||
      lower.includes('category 2')
    ) {
      return { isValid: false, reason: 'Prompt structure leakage detected' };
    }

    // Check: No greeting restart on follow-ups (e.g. "Hi 😊 Dream Hair...")
    if (isFollowUp && (lower.startsWith('hi 😊 dream') || lower.startsWith('hello! dream') || lower.startsWith('welcome to dream'))) {
      return { isValid: false, reason: 'Unwanted greeting reset on follow-up message' };
    }

    // Check: No false confirmation
    if (lower.includes('slot is confirmed') || lower.includes('booking is confirmed')) {
      return { isValid: false, reason: 'False booking confirmation hallucination' };
    }

    return { isValid: true };
  }

  /**
   * Main Reply Generation Pipeline (Requirement 2 & 28)
   */
  public async generateReply(params: GenerateReplyParams): Promise<AiReplyResult> {
    const startTime = Date.now();
    const aiSettings = db.getAiSettings();
    const conversation = params.conversationId ? db.getConversationById(params.conversationId) : undefined;
    const history = params.conversationId ? db.getMessagesByConversationId(params.conversationId) : [];

    // 1. Check whether AI is globally enabled
    if (!aiSettings.enabled) {
      return {
        replyText: '',
        status: 'fallback',
        reason: 'AI auto-reply is currently turned OFF in settings.',
        processingTimeMs: Date.now() - startTime
      };
    }

    // 2. Check whether conversation is in Human Mode
    if (conversation && conversation.mode === 'human') {
      return {
        replyText: '',
        status: 'human_required',
        reason: 'Conversation is currently assigned to Human Mode.',
        processingTimeMs: Date.now() - startTime
      };
    }

    // 3. Check whether customer explicitly requested a human staff member
    if (this.isHumanRequested(params.customerMessage, aiSettings)) {
      if (conversation) {
        await db.updateConversation(conversation.id, {
          mode: 'human',
          humanTakeoverReason: 'Customer requested human agent: "' + params.customerMessage.slice(0, 80) + '"'
        });
        await db.logAudit(
          'HUMAN_TAKEOVER_TRIGGERED',
          `Customer ${conversation.username} requested human agent.`
        );
      }
      return {
        replyText: `Ji obosshoi 😊 Aami aamader salon staff member-er sathe connect kore dichhi. Unara ekhoni apnake reply korben. Urgent hole direct call korte paren: ${db.getBusinessKnowledge().phoneNumber} ✨`,
        status: 'human_required',
        reason: 'Customer requested human staff member.',
        processingTimeMs: Date.now() - startTime
      };
    }

    // 4. Load latest Business Knowledge directly from Database (Requirement 8)
    const businessKnowledge = db.getBusinessKnowledge();
    const replyRules = db.getReplyRules();

    // 5. State-Driven Intent & Memory Engine (Requirement 3, 4, 5, 6, 7)
    const stateResult = this.resolveStateAndIntent(
      params.customerMessage,
      conversation,
      history,
      businessKnowledge
    );

    // If state engine resolved direct answer
    if (stateResult.replyText) {
      // Update persistent conversation state in database
      if (conversation && stateResult.updatedState) {
        await db.updateConversation(conversation.id, stateResult.updatedState);
      }

      // Safe debug log (Requirement 22)
      console.log('[AI State & Response Audit]', {
        conversationId: params.conversationId,
        customerId: params.username || params.conversationId,
        latestMessage: params.customerMessage,
        historyCount: history.length,
        currentIntent: stateResult.detectedIntent,
        pendingQuestion: stateResult.updatedState?.pendingQuestion || conversation?.pendingQuestion,
        appointmentState: stateResult.updatedState?.appointmentState || conversation?.appointmentState,
        knowledgeLoaded: true,
        knowledgeCategories: ['services_prices', 'offers_combos', 'salon_info', 'service_details', 'policies', 'faq', 'human_handoff', 'custom_knowledge'],
        geminiCalled: false,
        responseGenerated: stateResult.replyText,
        humanHandoff: false
      });

      return {
        replyText: this.sanitizeOutput(stateResult.replyText),
        status: 'success',
        processingTimeMs: Date.now() - startTime
      };
    }

    // If intent resolver requested human handoff
    if (stateResult.needsHuman) {
      if (conversation) {
        await db.updateConversation(conversation.id, {
          mode: 'human',
          humanTakeoverReason: stateResult.handoffReason
        });
      }
      return {
        replyText: stateResult.replyText || 'Ji 😊 Eita niye ami fully confirm korte parchi na. Apnake amader team-er sathe connect kore dichhi.',
        status: 'human_required',
        reason: stateResult.handoffReason,
        processingTimeMs: Date.now() - startTime
      };
    }

    // 6. Check custom reply rules
    const matchedRule = this.matchKeywordRule(params.customerMessage, replyRules);
    let ruleHint: string | undefined;

    if (matchedRule) {
      if (matchedRule.actionType === 'location') {
        const text = `Aamader salon ${businessKnowledge.location} 📍 Directions ba appointment-er jonno call korte paren: ${businessKnowledge.phoneNumber} 😊`;
        return {
          replyText: text,
          status: 'success',
          triggeredRule: matchedRule,
          processingTimeMs: Date.now() - startTime
        };
      } else if (matchedRule.actionType === 'contact') {
        const text = `Aamader phone number ${businessKnowledge.phoneNumber}, location ${businessKnowledge.location}. Open: ${businessKnowledge.openingHours} 😊`;
        return {
          replyText: text,
          status: 'success',
          triggeredRule: matchedRule,
          processingTimeMs: Date.now() - startTime
        };
      } else if (matchedRule.actionType === 'custom_response' && matchedRule.customResponse) {
        return {
          replyText: this.sanitizeOutput(matchedRule.customResponse),
          status: 'success',
          triggeredRule: matchedRule,
          processingTimeMs: Date.now() - startTime
        };
      } else if (matchedRule.actionType === 'knowledge') {
        ruleHint = `The customer asked about "${matchedRule.keyword}". Specifically refer to the official pricing/services in Business Knowledge in natural Banglish.`;
      }
    }

    // 7. Multi-Turn Gemini AI Intelligence Layer (Requirement 4 & gemini-api skill)
    let generatedText = '';
    const isFollowUp = history.length > 0;

    if (aiClient) {
      try {
        const systemInstruction = this.buildGeminiSystemInstruction(
          businessKnowledge,
          aiSettings,
          conversation,
          ruleHint,
          params.channel
        );

        // Build multi-turn chat contents array preserving conversation turns
        const chatContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

        // Add recent dialogue history (up to last 8 messages)
        const recentMessages = history.slice(-8);
        for (const msg of recentMessages) {
          if (msg.messageType === 'system') continue;
          chatContents.push({
            role: msg.direction === 'inbound' ? 'user' : 'model',
            parts: [{ text: msg.messageText }]
          });
        }

        // Add current user message turn
        chatContents.push({
          role: 'user',
          parts: [{ text: params.customerMessage }]
        });

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: chatContents,
          config: {
            systemInstruction,
            temperature: 0.4,
            maxOutputTokens: 250
          }
        });

        generatedText = (response.text || '').trim();
      } catch (err: any) {
        console.error('[AI Service] Gemini generateContent failed:', err);
        generatedText = this.generateFallback(params.customerMessage, businessKnowledge, isFollowUp);
      }
    } else {
      generatedText = this.generateFallback(params.customerMessage, businessKnowledge, isFollowUp);
    }

    // Post-process & sanitize
    generatedText = this.sanitizeOutput(generatedText);

    // 8. Response Validation Layer (Requirement 20)
    const validation = this.validateReply(generatedText, isFollowUp);
    if (!validation.isValid) {
      console.warn('[AI Service] Response validation warning:', validation.reason);
      // Clean up or safe fallback
      if (generatedText.toLowerCase().includes('category') || generatedText.toLowerCase().includes('gemini')) {
        generatedText = `Ji 😊 Apnar query niye help korte pari. Phone-e details jante call korte paren ${businessKnowledge.phoneNumber}-e.`;
      }
    }

    // Safe debug logging (Requirement 22)
    console.log('[AI State & Response Audit]', {
      conversationId: params.conversationId,
      customerId: params.username || params.conversationId,
      latestMessage: params.customerMessage,
      historyCount: history.length,
      currentIntent: 'gemini_conversational_response',
      pendingQuestion: conversation?.pendingQuestion,
      appointmentState: conversation?.appointmentState,
      knowledgeLoaded: true,
      knowledgeCategories: ['services_prices', 'offers_combos', 'salon_info', 'service_details', 'policies', 'faq', 'human_handoff', 'custom_knowledge'],
      geminiCalled: true,
      responseGenerated: generatedText.slice(0, 100),
      humanHandoff: false
    });

    return {
      replyText: generatedText,
      status: 'success',
      triggeredRule: matchedRule,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Deterministic knowledge-grounded fallback if Gemini key is temporarily missing
   */
  private generateFallback(message: string, bk: BusinessKnowledge, isFollowUp: boolean): string {
    const text = message.toLowerCase().trim();

    if (text.includes('offer') || text.includes('discount')) {
      return `${bk.specialOffers || 'Shob facial-er sathe D-Tan completely FREE!'} ✨`;
    }

    if (text.includes('facial')) {
      return 'Aamader shob facial-er sathe D-Tan FREE thakbe! Fruit Facial ₹999, Gold ₹999, Diamond ₹999, O3+ ₹1799 😊';
    }

    if (isFollowUp) {
      return `Ji 😊 Apnar request ta noted. Othoba direct call korte paren: ${bk.phoneNumber} ✨`;
    }

    return `Hi 😊 ${bk.businessName} theke bolchi. Ki service niye help lagbe? ✨`;
  }
}

export const aiService = new AiService();
