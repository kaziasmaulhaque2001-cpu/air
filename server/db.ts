import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  User,
  InstagramAccount,
  WhatsAppAccount,
  WhatsAppSettings,
  Conversation,
  Message,
  AiSettings,
  BusinessKnowledge,
  ServicePriceItem,
  ReplyRule,
  WebhookEvent,
  AuditLog,
  Session
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'instasalt_2026').digest('hex');
}

export function defaultAliasesForService(name: string): string[] {
  const lower = name.toLowerCase();
  const aliases: string[] = [];

  // Hair Straightening / Smoothing
  if (lower.includes('strex')) {
    aliases.push('Hair Smoothing', 'Smoothing', 'Smoothening', 'Hair Smoothening', 'Straightening', 'Hair Straightening', 'Strex', 'Strex smoothing', 'Strex hair smoothing', 'Strex straightening');
  } else if (lower.includes('gents') && (lower.includes('straight') || lower.includes('smooth'))) {
    aliases.push('Gents straightening', 'Gents smoothing', 'Gents smoothening', 'Men straightening', 'Men smoothing');
  } else if (lower.includes('straight') || lower.includes('smooth')) {
    aliases.push('Hair Smoothing', 'Smoothing', 'Smoothening', 'Hair Smoothening', 'Straightening', 'Hair Straightening');
  }

  // Hair Cut
  else if (lower.includes('normal') && lower.includes('hair cut')) {
    aliases.push('Normal hair cut', 'Normal ladies haircut', 'Normal ladies hair cut', 'Normal cutting', 'Normal');
  } else if (lower.includes('advanced') && lower.includes('hair cut')) {
    aliases.push('Advanced hair cut', 'Advanced ladies haircut', 'Advanced ladies hair cut', 'Advanced cutting', 'Advanced');
  } else if (lower.includes('gents hair cut') || lower.includes('gents haircut')) {
    aliases.push('Gents hair cut', 'Gents haircut', 'Men hair cut', 'Men haircut');
  } else if (lower.includes('ladies hair cut') || lower.includes('ladies haircut')) {
    aliases.push('Ladies hair cut', 'Ladies haircut', 'Women hair cut', 'Women haircut');
  } else if (lower.includes('hair cut') || lower.includes('haircut')) {
    aliases.push('Cutting', 'Chul kata', 'Chul katbo');
  } else if (lower.includes('shaving')) {
    aliases.push('Shave', 'Shaving', 'Gents shaving', 'Dari kata');
  }

  // Botox
  else if (lower.includes('botox') && (lower.includes('gents') || lower.includes('men'))) {
    aliases.push('Gents botox', 'Men botox', 'Botox gents', 'Gents hair botox');
  } else if (lower.includes('botox') && (lower.includes('ladies') || lower.includes('women'))) {
    aliases.push('Ladies botox', 'Women botox', 'Botox ladies', 'Ladies hair botox');
  } else if (lower.includes('botox')) {
    aliases.push('Botox treatment', 'Hair botox');
  }

  // Keratin
  else if (lower.includes('keratin') && (lower.includes('gents') || lower.includes('men'))) {
    aliases.push('Gents keratin', 'Men keratin', 'Keratin gents', 'Gents hair keratin');
  } else if (lower.includes('keratin') && (lower.includes('ladies') || lower.includes('women'))) {
    aliases.push('Ladies keratin', 'Women keratin', 'Keratin ladies', 'Ladies hair keratin');
  } else if (lower.includes('keratin')) {
    aliases.push('Keratin treatment', 'Hair keratin');
  }

  // Nanoplastia
  else if (lower.includes('nanoplastia') && (lower.includes('gents') || lower.includes('men'))) {
    aliases.push('Gents nanoplastia', 'Men nanoplastia', 'Nanoplastia gents');
  } else if (lower.includes('nanoplastia') && (lower.includes('ladies') || lower.includes('women'))) {
    aliases.push('Ladies nanoplastia', 'Women nanoplastia', 'Nanoplastia ladies');
  } else if (lower.includes('nanoplastia')) {
    aliases.push('Organic smoothing', 'Nano plastia');
  }

  // Hair Spa
  else if (lower.includes('spa') && (lower.includes('gents') || lower.includes('men'))) {
    aliases.push('Gents hair spa', 'Men hair spa', 'Gents spa');
  } else if (lower.includes('spa') && (lower.includes('ladies') || lower.includes('women'))) {
    aliases.push('Ladies hair spa', 'Women hair spa', 'Ladies spa');
  } else if (lower.includes('spa')) {
    aliases.push('Hair spa', 'Spa', 'Hair treatment');
  }

  // Hair Colour
  else if (lower.includes('highlights') && lower.includes('stick')) {
    aliases.push('Ladies highlights', 'Highlights per stick', 'Hair highlights sticks', '149 per stick');
  } else if (lower.includes('colour') || lower.includes('color')) {
    if (lower.includes('gents') || lower.includes('men')) {
      aliases.push('Gents hair colour', 'Men hair colour', 'Gents hair color');
    } else if (lower.includes('ladies') || lower.includes('women')) {
      aliases.push('Ladies hair colour', 'Women hair colour', 'Ladies hair color');
    }
  }

  // Facial, Waxing, Threading
  else if (lower.includes('facial')) {
    aliases.push('Facial', 'Face facial');
  } else if (lower.includes('waxing') || lower.includes('wax')) {
    aliases.push('Wax', 'Waxing');
  } else if (lower.includes('threading')) {
    aliases.push('Threading', 'Eyebrow');
  }
  return aliases;
}

export const defaultWhatsAppAccount: WhatsAppAccount = {
  id: 'wa_acc_default',
  userId: 'user_admin',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  displayPhoneNumber: '',
  verifiedName: 'Dream Hair & Beauty Family Salon',
  status: 'not_connected',
  webhookStatus: 'unverified',
  connectedAt: undefined,
  isSimulated: false
};

export const defaultWhatsAppSettings: WhatsAppSettings = {
  id: 'wa_settings_default',
  enabled: true,
  autoReply: true,
  humanTakeover: false,
  updatedAt: new Date().toISOString()
};

const defaultBusinessKnowledge: BusinessKnowledge = {
  id: 'bk_default',
  businessName: 'Dream Hair & Beauty Family Salon',
  businessDescription: 'Premium family salon in Katwa offering expert hair cut, hair spa, hair straightening, Botox, keratin, facials with free D-Tan, waxing, threading, and nail extensions for Gents, Ladies, and Kids.',
  location: 'Telephone Maidan, Katwa',
  phoneNumber: '6294748025',
  openingHours: 'Monday - Sunday: 10:00 AM - 9:00 PM',
  services: [
    'Hair Cut & Shaving (Gents ₹99, Normal Ladies ₹249, Advanced Ladies ₹349, Kids ₹99-149)',
    'Hair Spa (Gents ₹399-599, Ladies Any Length ₹799-1999)',
    'Hair Colour & Highlights (Gents ₹499, Ladies ₹1199, Highlights ₹149/stick)',
    'Hair Straightening (Strex ₹2199, Loreal ₹3199, Matrix ₹3499, Schwarzkopf ₹3799, Wella ₹3999, Gents ₹999)',
    'Hair Treatments (Botox: Gents ₹1199 / Ladies ₹2799, Keratin: Gents ₹1299 / Ladies ₹2999, Nanoplastia: Gents ₹1999 / Ladies ₹3799)',
    'Facials - D-Tan FREE with every facial (Fruit, Gold, Diamond, Pearl, Hydra, O3+, Lotus, Korean Glass)',
    'Waxing (Full Hand ₹199, Leg ₹199, Under Arms ₹99, Back ₹149)',
    'Threading (Eyebrow ₹30, Lip ₹30, Full Face ₹150)',
    'D-Tan & Face Clean Up (Clean Up ₹149, Massage ₹199, Face D-Tan ₹499-799)',
    'Nail Extension (Both ₹500)'
  ],
  servicePrices: [
    // HAIR CUT
    { id: 'sp_gents_haircut', service: 'Gents Hair Cut', category: 'Hair Cut', gender: 'Gents', price: '₹99', description: 'Professional Gents Hair Cut', aliases: ['Hair cut', 'Haircut', 'Men haircut', 'Gents haircut', 'Chul kata', 'Cutting', 'Chul katbo'], isEnabled: true },
    { id: 'sp_gents_shaving', service: 'Gents Shaving', category: 'Hair Cut', gender: 'Gents', price: '₹99', description: 'Clean Beard Shave / Styling', aliases: ['Shave', 'Shaving', 'Dari kata', 'Gents shave'], isEnabled: true },
    { id: 'sp_normal_ladies_haircut', service: 'Normal Ladies Hair Cut', category: 'Hair Cut', gender: 'Ladies', price: '₹249', description: 'Hair Wash + Blow Dry — FREE with Ladies Hair Cut', aliases: ['Normal hair cut', 'Normal ladies haircut', 'Normal ladies hair cut', 'Normal cutting', 'Normal', 'Ladies hair cut', 'Ladies haircut'], isEnabled: true },
    { id: 'sp_advanced_ladies_haircut', service: 'Advanced Ladies Hair Cut', category: 'Hair Cut', gender: 'Ladies', price: '₹349', description: 'Hair Wash + Blow Dry — FREE with Ladies Hair Cut', aliases: ['Advanced hair cut', 'Advanced ladies haircut', 'Advanced ladies hair cut', 'Advanced cutting', 'Advanced'], isEnabled: true },
    { id: 'sp_happy_child_boy', service: 'Happy Child Boy', category: 'Hair Cut', gender: 'Kids', price: '₹99', description: 'Gentle haircut for young boys', aliases: ['Happy child boy', 'Child haircut', 'Boy haircut', 'Boy hair cut'], isEnabled: true },
    { id: 'sp_happy_child_girl', service: 'Happy Child Girl', category: 'Hair Cut', gender: 'Kids', price: '₹149', description: 'Gentle styling and haircut for young girls', aliases: ['Happy child girl', 'Child girl', 'Girl haircut', 'Girl hair cut'], isEnabled: true },

    // HAIR SPA - GENTS
    { id: 'sp_spa_loreal_gents', service: 'Loreal Hair Spa', category: 'Hair Spa', brand: 'Loreal', gender: 'Gents', price: '₹399', description: 'Loreal nourishing hair spa for men', aliases: ['Loreal hair spa', 'Loreal spa gents', 'Gents loreal hair spa'], isEnabled: true },
    { id: 'sp_spa_matrix_gents', service: 'Matrix Hair Spa', category: 'Hair Spa', brand: 'Matrix', gender: 'Gents', price: '₹449', description: 'Matrix deep moisturizing hair spa for men', aliases: ['Matrix hair spa', 'Matrix spa gents', 'Gents matrix hair spa'], isEnabled: true },
    { id: 'sp_spa_wella_gents', service: 'Wella Hair Spa', category: 'Hair Spa', brand: 'Wella', gender: 'Gents', price: '₹499', description: 'Wella intensive repair hair spa for men', aliases: ['Wella hair spa', 'Wella spa gents', 'Gents wella hair spa'], isEnabled: true },
    { id: 'sp_spa_schwarzkopf_gents', service: 'Schwarzkopf Hair Spa', category: 'Hair Spa', brand: 'Schwarzkopf', gender: 'Gents', price: '₹499', description: 'Schwarzkopf fiber therapy hair spa for men', aliases: ['Schwarzkopf hair spa', 'Schwarzkopf spa gents', 'Gents schwarzkopf hair spa'], isEnabled: true },
    { id: 'sp_spa_oil_reflection_gents', service: 'Oil Reflection Hair Spa', category: 'Hair Spa', brand: 'Wella', gender: 'Gents', price: '₹549', description: 'Wella Oil Reflections luminous hair spa for men', aliases: ['Oil reflection hair spa', 'Oil reflection gents', 'Gents oil reflection hair spa'], isEnabled: true },
    { id: 'sp_spa_fushion_gents', service: 'Fushion Hair Spa', category: 'Hair Spa', brand: 'Fushion', gender: 'Gents', price: '₹599', description: 'Fushion amino-refill intense hair spa for men', aliases: ['Fushion hair spa', 'Fushion spa gents', 'Gents fushion hair spa', 'Fusion hair spa'], isEnabled: true },

    // HAIR SPA - LADIES ANY LENGTH
    { id: 'sp_spa_loreal_repair_ladies', service: 'Loreal Repair Hair Spa', category: 'Hair Spa', brand: 'Loreal', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹849', description: 'Loreal Total Repair Hair Spa (Ladies Any Length)', aliases: ['Loreal repair hair spa', 'Loreal repair spa', 'Repair hair spa ladies', 'Loreal repair ladies'], isEnabled: true },
    { id: 'sp_spa_loreal_smooth_ladies', service: 'Loreal Smooth Hair Spa', category: 'Hair Spa', brand: 'Loreal', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹799', description: 'Loreal Smooth Intense Hair Spa (Ladies Any Length)', aliases: ['Loreal smooth hair spa', 'Loreal smooth spa', 'Smooth hair spa ladies', 'Loreal smooth ladies'], isEnabled: true },
    { id: 'sp_spa_wella_ladies', service: 'Wella Hair Spa', category: 'Hair Spa', brand: 'Wella', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹1099', description: 'Wella Brilliance / Enriched Hair Spa (Ladies Any Length)', aliases: ['Wella hair spa', 'Wella spa ladies', 'Wella hair spa ladies'], isEnabled: true },
    { id: 'sp_spa_schwarzkopf_ladies', service: 'Schwarzkopf Hair Spa', category: 'Hair Spa', brand: 'Schwarzkopf', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹1299', description: 'Schwarzkopf BC Bonacure Hair Spa (Ladies Any Length)', aliases: ['Schwarzkopf hair spa', 'Schwarzkopf spa ladies', 'Schwarzkopf hair spa ladies'], isEnabled: true },
    { id: 'sp_spa_oil_reflection_ladies', service: 'Oil Reflection Hair Spa', category: 'Hair Spa', brand: 'Wella', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹1699', description: 'Wella Oil Reflections Premium Hair Spa (Ladies Any Length)', aliases: ['Oil reflection hair spa', 'Oil reflection ladies', 'Oil reflection hair spa ladies'], isEnabled: true },
    { id: 'sp_spa_fushion_ladies', service: 'Fushion Hair Spa', category: 'Hair Spa', brand: 'Fushion', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹1999', description: 'Wella Fushion Intense Damage Care Hair Spa (Ladies Any Length)', aliases: ['Fushion hair spa', 'Fushion spa ladies', 'Fushion hair spa ladies', 'Fusion hair spa ladies'], isEnabled: true },

    // HAIR COLOUR
    { id: 'sp_colour_gents', service: 'Gents Hair Colour', category: 'Hair Colour', gender: 'Gents', price: '₹499', description: 'Gents Global Hair Colour', aliases: ['Hair colour gents', 'Men hair color', 'Gents global hair colour', 'Gents hair color'], isEnabled: true },
    { id: 'sp_highlights_gents', service: 'Gents Highlights', category: 'Hair Colour', gender: 'Gents', price: '₹999', description: 'Gents Highlights / Fashion Streaks', aliases: ['Highlights men', 'Men highlights', 'Gents hair highlights', 'Gents highlights'], isEnabled: true },
    { id: 'sp_colour_ladies', service: 'Ladies Hair Colour', category: 'Hair Colour', gender: 'Ladies', price: '₹1199', description: 'Ladies Global Hair Colour', aliases: ['Hair colour ladies', 'Women hair color', 'Ladies global hair colour', 'Ladies hair color'], isEnabled: true },
    { id: 'sp_highlights_ladies', service: 'Ladies Highlights', category: 'Hair Colour', gender: 'Ladies', price: '₹149 per Stick', description: 'Ladies Fashion Streaks per stick', aliases: ['Ladies highlights', 'Highlights per stick', 'Hair highlights sticks', '149 per stick', 'Highlights stick'], isEnabled: true },

    // HAIR STRAIGHTENING (Official category = Hair Straightening. Never mix Hair Spa prices!)
    { id: 'sp_straightening_gents', service: 'Gents Hair Straightening', category: 'Hair Straightening', gender: 'Gents', price: '₹999', description: 'Gents permanent hair straightening', aliases: ['Gents straightening', 'Gents smoothing', 'Gents smoothening', 'Men straightening', 'Men smoothing'], isEnabled: true },
    { id: 'sp_strex_straightening', service: 'Strex Hair Straightening', category: 'Hair Straightening', brand: 'Strex', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹2199', description: 'Strex Hair Straightening (Ladies Any Length)', aliases: ['Hair Smoothing', 'Smoothing', 'Smoothening', 'Hair Smoothening', 'Straightening', 'Hair Straightening', 'Strex', 'Strex smoothing', 'Strex hair smoothing', 'Strex straightening', 'Strex hair straightening', 'Ladies Strex'], isEnabled: true },
    { id: 'sp_loreal_straightening', service: 'Loreal Hair Straightening', category: 'Hair Straightening', brand: 'Loreal', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹3199', description: 'Loreal X-Tenso Hair Straightening (Ladies Any Length)', aliases: ['Loreal straightening', 'Loreal smoothing', 'Loreal hair smoothing', 'Loreal hair straightening', 'Hair Straightening', 'Straightening'], isEnabled: true },
    { id: 'sp_matrix_straightening', service: 'Matrix Hair Straightening', category: 'Hair Straightening', brand: 'Matrix', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹3499', description: 'Matrix Opti.Sculpt Hair Straightening (Ladies Any Length)', aliases: ['Matrix straightening', 'Matrix smoothing', 'Matrix hair smoothing', 'Matrix hair straightening', 'Hair Straightening', 'Straightening'], isEnabled: true },
    { id: 'sp_schwarzkopf_straightening', service: 'Schwarzkopf Hair Straightening', category: 'Hair Straightening', brand: 'Schwarzkopf', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹3799', description: 'Schwarzkopf Glatt Hair Straightening (Ladies Any Length)', aliases: ['Schwarzkopf straightening', 'Schwarzkopf smoothing', 'Schwarzkopf hair smoothing', 'Schwarzkopf hair straightening', 'Hair Straightening', 'Straightening'], isEnabled: true },
    { id: 'sp_wella_straightening', service: 'Wella Hair Straightening', category: 'Hair Straightening', brand: 'Wella', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹3999', description: 'Wella Creatine+ Straightening (Ladies Any Length)', aliases: ['Wella straightening', 'Wella smoothing', 'Wella hair smoothing', 'Wella hair straightening', 'Hair Straightening', 'Straightening'], isEnabled: true },

    // HAIR TREATMENT - GENTS
    { id: 'sp_botox_gents', service: 'Gents Botox', category: 'Hair Treatment', gender: 'Gents', price: '₹1199', description: 'Gents hair fiber rejuvenating Botox treatment', aliases: ['Men botox', 'Botox gents', 'Gents hair botox', 'Botox'], isEnabled: true },
    { id: 'sp_keratin_gents', service: 'Gents Keratin', category: 'Hair Treatment', gender: 'Gents', price: '₹1299', description: 'Gents frizz-eliminating Keratin treatment', aliases: ['Men keratin', 'Keratin gents', 'Gents hair keratin', 'Keratin'], isEnabled: true },
    { id: 'sp_nanoplastia_gents', service: 'Gents Nanoplastia', category: 'Hair Treatment', gender: 'Gents', price: '₹1999', description: 'Gents formaldehyde-free organic Nanoplastia smoothing', aliases: ['Men nanoplastia', 'Nanoplastia gents', 'Gents hair nanoplastia', 'Nanoplastia'], isEnabled: true },
    { id: 'sp_dandruff_gents', service: 'Gents Dandruff Treatment', category: 'Hair Treatment', gender: 'Gents', price: '₹499', description: 'Gents deep scalp clarifying Anti-Dandruff treatment', aliases: ['Dandruff gents', 'Men dandruff', 'Gents dandruff treatment'], isEnabled: true },
    { id: 'sp_hair_pumping_gents', service: 'Gents Hair Pumping', category: 'Hair Treatment', gender: 'Gents', price: '₹999', description: 'Gents Hair Pumping volume therapy', aliases: ['Hair pumping gents', 'Hair pumping', 'Gents hair pumping'], isEnabled: true },

    // HAIR TREATMENT - LADIES ANY LENGTH
    { id: 'sp_botox_ladies', service: 'Ladies Botox', category: 'Hair Treatment', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹2799', description: 'Ladies Any Length intensive Botox fiber restoration', aliases: ['Ladies botox', 'Botox ladies', 'Women botox', 'Botox any length', 'Botox'], isEnabled: true },
    { id: 'sp_keratin_ladies', service: 'Ladies Keratin', category: 'Hair Treatment', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹2999', description: 'Ladies Any Length mirror-shine Keratin protein therapy', aliases: ['Ladies keratin', 'Keratin ladies', 'Women keratin', 'Keratin any length', 'Keratin'], isEnabled: true },
    { id: 'sp_nanoplastia_ladies', service: 'Ladies Nanoplastia', category: 'Hair Treatment', gender: 'Ladies Any Length', hairLength: 'Any Length', price: '₹3799', description: 'Ladies Any Length organic amino-acid Nanoplastia straight silky finish', aliases: ['Ladies nanoplastia', 'Nanoplastia ladies', 'Women nanoplastia', 'Nanoplastia any length', 'Nanoplastia'], isEnabled: true },
    { id: 'sp_dandruff_ladies', service: 'Ladies Dandruff Treatment', category: 'Hair Treatment', gender: 'Ladies Any Length', price: '₹499', description: 'Ladies Any Length clarifying scalp peeling and anti-dandruff care', aliases: ['Dandruff ladies', 'Ladies dandruff treatment', 'Women dandruff'], isEnabled: true },
    { id: 'sp_dandruff_ozon_ladies', service: 'Ladies Dandruff + Ozon', category: 'Hair Treatment', gender: 'Ladies Any Length', price: '₹799', description: 'Ladies Any Length advanced Ozone scalp therapy for severe dandruff', aliases: ['Dandruff ozon', 'Ladies dandruff ozon', 'Dandruff + ozon'], isEnabled: true },

    // FACIAL — D-TAN FREE
    { id: 'sp_facial_fruit', service: 'Fruit Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Fruit facial', 'Fruit face facial'], isEnabled: true },
    { id: 'sp_facial_gold', service: 'Gold Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Gold facial', 'Gold glow facial'], isEnabled: true },
    { id: 'sp_facial_diamond', service: 'Diamond Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Diamond facial', 'Daimond Facial', 'Diamond polish facial'], isEnabled: true },
    { id: 'sp_facial_pearl', service: 'Pearl Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Pearl facial', 'Perl Facial', 'Pearl glow facial'], isEnabled: true },
    { id: 'sp_facial_o3', service: 'O3+ Facial', category: 'Facial', gender: 'All', price: '₹1799', description: 'D-Tan FREE included', aliases: ['O3+ facial', 'O3 facial', 'O3 plus facial', 'O3+'], isEnabled: true },
    { id: 'sp_facial_goldsheen', service: 'Goldsheen Facial', category: 'Facial', gender: 'All', price: '₹1499', description: 'D-Tan FREE included', aliases: ['Goldsheen facial', 'Goldsheen'], isEnabled: true },
    { id: 'sp_facial_lotus', service: 'Lotus Facial', category: 'Facial', gender: 'All', price: '₹1199', description: 'D-Tan FREE included', aliases: ['Lotus facial', 'Lotus herbal facial'], isEnabled: true },
    { id: 'sp_facial_hydra', service: 'Hydra Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Hydra facial', 'Hydra glow facial'], isEnabled: true },
    { id: 'sp_facial_antiaging', service: 'Antiaging Facial', category: 'Facial', gender: 'All', price: '₹1199', description: 'D-Tan FREE included', aliases: ['Antiaging facial', 'Anti aging facial', 'Anti-aging facial'], isEnabled: true },
    { id: 'sp_facial_acne', service: 'Acne Facial', category: 'Facial', gender: 'All', price: '₹999', description: 'D-Tan FREE included', aliases: ['Acne facial', 'Acne treatment facial', 'Anti acne facial'], isEnabled: true },
    { id: 'sp_facial_pigmentation', service: 'Pigmentation Facial', category: 'Facial', gender: 'All', price: '₹1999', description: 'D-Tan FREE included', aliases: ['Pigmentation facial', 'Pigmentation treatment facial', 'De-pigmentation facial'], isEnabled: true },
    { id: 'sp_facial_instafair', service: 'Insta Fair Facial', category: 'Facial', gender: 'All', price: '₹1699', description: 'D-Tan FREE included', aliases: ['Insta Fair Facial', 'Insta fair', 'Instant fair facial'], isEnabled: true },
    { id: 'sp_facial_korean_glass', service: 'Korean Glass', category: 'Facial', gender: 'All', price: '₹1299', description: 'D-Tan FREE included', aliases: ['Korean glass facial', 'Glass skin facial', 'Korean glass'], isEnabled: true },

    // WAXING
    { id: 'sp_wax_fullhand', service: 'Full Hand Waxing (Both)', category: 'Waxing', gender: 'Ladies', price: '₹199', description: 'Smooth waxing for both hands', aliases: ['Full hand wax', 'Hand waxing', 'Full hand waxing', 'Both hand waxing'], isEnabled: true },
    { id: 'sp_wax_underarms', service: 'Under Arms', category: 'Waxing', gender: 'Ladies', price: '₹99', description: 'Gentle underarms waxing', aliases: ['Under arms', 'Under arms wax', 'Under arms waxing', 'Underarm waxing'], isEnabled: true },
    { id: 'sp_wax_leg', service: 'Leg Waxing (Both)', category: 'Waxing', gender: 'Ladies', price: '₹199', description: 'Smooth leg waxing for both legs', aliases: ['Leg waxing', 'Leg wax', 'Full leg waxing', 'Both leg waxing'], isEnabled: true },
    { id: 'sp_wax_back', service: 'Back Waxing', category: 'Waxing', gender: 'Ladies', price: '₹149', description: 'Full back waxing', aliases: ['Back waxing', 'Back wax'], isEnabled: true },

    // THREADING
    { id: 'sp_thread_eyebrow', service: 'Eyebrow', category: 'Threading', gender: 'Ladies', price: '₹30', description: 'Precision eyebrow threading and shaping', aliases: ['Eyebrow', 'Eyebrow threading', 'Eyebrows'], isEnabled: true },
    { id: 'sp_thread_lip', service: 'Upper Lip + Lower Lip', category: 'Threading', gender: 'Ladies', price: '₹30', description: 'Upper and lower lip threading', aliases: ['Upper lip + lower lip', 'Upper Lip + Lower Lip', 'Lip threading', 'Upper lip'], isEnabled: true },
    { id: 'sp_thread_fullface', service: 'Full Face Threading', category: 'Threading', gender: 'Ladies', price: '₹150', description: 'Complete full face threading and shaping', aliases: ['Full face threading', 'Full face thread'], isEnabled: true },

    // D-TAN
    { id: 'sp_dtan_rega_face', service: 'Face D-Tan (Rega)', category: 'D-Tan', price: '₹499', description: 'Rega Face D-Tan treatment', aliases: ['Face d-tan (rega)', 'Rega d-tan', 'Rega dtan', 'Face d-tan rega'], isEnabled: true },
    { id: 'sp_dtan_o3_face', service: 'Face D-Tan (O3+)', category: 'D-Tan', price: '₹799', description: 'O3+ Premium Face D-Tan pack', aliases: ['Face d-tan (o3+)', 'O3 dtan', 'O3 face d-tan', 'Face d-tan o3+'], isEnabled: true },
    { id: 'sp_dtan_hand', service: 'Hand D-Tan (Both)', category: 'D-Tan', price: '₹399', description: 'Both hands detanning therapy', aliases: ['Hand d-tan (both)', 'Hand dtan', 'Hand d-tan', 'Both hand d-tan'], isEnabled: true },
    { id: 'sp_dtan_leg', service: 'Leg D-Tan (Both)', category: 'D-Tan', price: '₹499', description: 'Both legs detanning therapy', aliases: ['Leg d-tan (both)', 'Leg dtan', 'Leg d-tan', 'Both leg d-tan'], isEnabled: true },
    { id: 'sp_dtan_back', service: 'Back D-Tan', category: 'D-Tan', price: '₹249', description: 'Back detanning and skin glow therapy', aliases: ['Back d-tan', 'Back dtan'], isEnabled: true },
    { id: 'sp_face_cleanup', service: 'Face Clean Up', category: 'D-Tan', price: '₹149', description: 'Deep pore face cleanup and exfoliation', aliases: ['Face clean up', 'Clean up', 'Face cleanup'], isEnabled: true },
    { id: 'sp_face_massage', service: 'Normal Face Massage', category: 'D-Tan', price: '₹199', description: 'Relaxing facial massage and blood circulation boost', aliases: ['Normal face massage', 'Face massage'], isEnabled: true },

    // NAIL EXTENSION
    { id: 'sp_nail_extension', service: 'Nail Extension (Both)', category: 'Nail Extension', price: '₹500', description: 'Nail Extension for both hands with gel polish overlay', aliases: ['Nail extension (both)', 'Nail extension', 'Nail extensions', 'Nails'], isEnabled: true }
  ],
  // Category 2: Offers & Combos
  specialOffers: 'D-Tan FREE with every facial! Ladies Hair Cut includes FREE Hair Wash + Blow Dry!',
  offersAndCombos: 'Current active salon offers: 1. Complimentary D-Tan FREE with every facial service! 2. Complimentary Hair Wash + Blow Dry FREE with Ladies Hair Cut! 3. Special Bride & Groom packages available on advance consultation.',

  // Category 3: Salon Information
  salonInfo: 'Dream Hair & Beauty Family Salon is a premium family salon located at Telephone Maidan, Katwa. Contact: 6294748025. Timing: Open Monday to Sunday from 10:00 AM to 9:00 PM. Full-service unisex salon serving Gents, Ladies, and Kids.',

  // Category 4: Service Details
  serviceDetails: [
    { service: 'Botox Treatment', details: 'Deep hair conditioning and fiber rejuvenation formula for frizzy, dull, and damaged hair. Lasts 3-5 months with proper sulfate-free shampoo care.', duration: '2 to 3 hours', recommendedFor: 'Damaged, chemically treated, or frizzy hair' },
    { service: 'Keratin Treatment', details: 'Intense keratin protein infusion that straightens waves, eliminates frizz, and adds brilliant mirror shine. Lasts 3-6 months.', duration: '2.5 to 3.5 hours', recommendedFor: 'Wavy, unmanageable, or humid-frizzy hair' },
    { service: 'Nanoplastia', details: 'Organic amino acid smoothing treatment that deeply nourishes and straightens without formaldehyde or harsh fumes.', duration: '3 to 4 hours', recommendedFor: 'Thick, curly, resistant hair seeking straight sleek finish' },
    { service: 'Facials with Free D-Tan', details: 'All 13 facials (Fruit, Gold, Diamond, Pearl, Hydra, O3+, Korean Glass, Lotus, etc.) include a complimentary D-Tan pack for instant tan removal and glow.', duration: '45 to 60 minutes', recommendedFor: 'Skin brightening, detanning, deep cleansing' }
  ],

  // Category 5: Policies
  bookingInformation: 'Appointments can be requested via Instagram DM, phone call, or visiting our salon in person. Walk-ins are welcome based on stylist availability. Chemical treatments require advance notice.',
  paymentInformation: 'We accept UPI (Google Pay, PhonePe, Paytm), Cash, and all major Debit/Credit Cards.',
  policies: 'Appointments are requested by customer preference; advance notice is recommended for chemical hair treatments (Botox, Keratin, Smoothing, Highlights). Walk-ins are accepted for haircuts and quick grooming based on floor queue. Please arrive 10 minutes prior to requested time.',
  additionalInformation: 'Please inform our stylists about any scalp sensitivity, allergies, or prior chemical treatments before beginning.',

  // Category 6: FAQ
  faqs: [
    {
      question: 'Do you offer hair treatments for both men and women?',
      answer: 'Yes! Dream Hair & Beauty is a full-service family salon catering to Gents, Ladies, and Kids.'
    },
    {
      question: 'Is D-Tan free with facials?',
      answer: 'Yes! D-Tan is completely FREE with every facial treatment at our salon.'
    },
    {
      question: 'Is parking available near Telephone Maidan?',
      answer: 'Yes, convenient bike and car parking is available right near Telephone Maidan.'
    },
    {
      question: 'What products are used for Hair Spa?',
      answer: 'We use genuine Loreal, Matrix, Wella, and Schwarzkopf professional products.'
    }
  ],

  // Category 7: Human Handoff Instructions
  humanHandoffInstructions: 'If customer has a complex custom bridal request, billing dispute, scalp medical issue, or requests an unavailable service, politely connect them to our salon staff or offer direct phone contact at 6294748025.',

  // Category 8: Custom Knowledge
  customKnowledge: [
    { topic: 'Atmosphere & Hygiene', information: 'Fully air-conditioned modern salon with sanitized tools, disposable aprons, and professional hair washing stations.' },
    { topic: 'Kids Grooming', information: 'Special kid-friendly gentle haircuts for boys (₹99) and girls (₹149).' }
  ],

  updatedAt: new Date().toISOString()
};

const defaultAiSettings: AiSettings = {
  id: 'ai_settings_default',
  enabled: true,
  responseStyle: 'friendly',
  customInstructions: 'You are the polite, helpful Instagram customer support staff for Dream Hair & Beauty Family Salon. Always reply in NATURAL BANGLISH (Bengali language written ONLY using English/Roman letters, NEVER Bengali script). Use English salon terms naturally (hair spa, haircut, Botox, appointment, booking, price). Keep replies short (1-2 sentences) and conversational like a real Instagram chat. Never invent prices or services not in Business Knowledge.',
  temperature: 0.7,
  maxTokens: 300,
  autoHumanKeywords: ['human', 'agent', 'staff', 'talk to someone', 'representative', 'real person', 'call me', 'complaint'],
  updatedAt: new Date().toISOString()
};

const defaultReplyRules: ReplyRule[] = [
  {
    id: 'rule_price',
    keyword: 'price',
    matchType: 'contains',
    actionType: 'knowledge',
    customResponse: 'Check Business Knowledge for exact pricing and services list.',
    isEnabled: true,
    priority: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_location',
    keyword: 'location',
    matchType: 'contains',
    actionType: 'location',
    customResponse: 'Aamader salon Telephone Maidan, Katwa-te. Directions ba appointment-er jonno call korun: 6294748025 📍😊',
    isEnabled: true,
    priority: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_appointment',
    keyword: 'appointment',
    matchType: 'contains',
    actionType: 'appointment',
    customResponse: 'Haan 😊 Kal ba onno je kono din appointment neya jabe! Kon date, time ar service chaichen bolben? Othoba direct call korun: 6294748025 💇✨',
    isEnabled: true,
    priority: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_contact',
    keyword: 'contact',
    matchType: 'contains',
    actionType: 'contact',
    customResponse: 'Aamader phone number 6294748025, location Telephone Maidan, Katwa. Open: 10:00 AM - 9:00 PM 😊',
    isEnabled: true,
    priority: 4,
    createdAt: new Date().toISOString()
  }
];

const defaultInstagramAccount: InstagramAccount = {
  id: 'ig_acc_default',
  userId: 'user_admin',
  instagramUserId: '17841472284295174',
  username: 'dream_familysalon',
  name: 'Dream Hair & Beauty Family Salon',
  profilePictureUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150&auto=format&fit=crop&q=80',
  businessAccountId: '17841472284295174',
  pageId: '109283741029384',
  status: 'connected',
  connectedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  tokenStatus: 'valid',
  tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
  isSimulated: false
};

const initialUsers: User[] = [
  {
    id: 'user_admin',
    email: 'admin@instasalon.com',
    name: 'Salon Manager',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

const initialConversations: Conversation[] = [
  {
    id: 'conv_1',
    channel: 'instagram',
    instagramUserId: 'ig_user_priya88',
    username: 'priya_sharma_wb',
    customerName: 'Priya Sharma',
    status: 'active',
    mode: 'ai',
    unreadCount: 0,
    lastMessageSnippet: 'Thank you! I will visit this Saturday around 11 AM.',
    lastMessageAt: new Date(Date.now() - 15 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    isDemo: true
  },
  {
    id: 'conv_2',
    channel: 'instagram',
    instagramUserId: 'ig_user_arjun_k',
    username: 'arjun_katwa_fit',
    customerName: 'Arjun Sen',
    status: 'active',
    mode: 'human',
    humanTakeoverReason: 'Customer requested human agent for custom bridal/groom booking inquiry.',
    unreadCount: 1,
    lastMessageSnippet: 'Can someone call me? I want to discuss a full groom package.',
    lastMessageAt: new Date(Date.now() - 42 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    isDemo: true
  },
  {
    id: 'conv_3',
    channel: 'instagram',
    instagramUserId: 'ig_user_sneha_m',
    username: 'sneha_mukherjee',
    customerName: 'Sneha Mukherjee',
    status: 'active',
    mode: 'ai',
    unreadCount: 0,
    lastMessageSnippet: 'Ladies Keratin (Any Length) ₹2999, Gents Keratin ₹1299 😊',
    lastMessageAt: new Date(Date.now() - 110 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 110 * 60000).toISOString(),
    isDemo: true
  }
];

const initialMessages: Message[] = [
  {
    id: 'msg_1_1',
    conversationId: 'conv_1',
    senderId: 'ig_user_priya88',
    senderName: 'priya_sharma_wb',
    messageText: 'Hello! Where is your salon located in Katwa?',
    direction: 'inbound',
    messageType: 'text',
    status: 'received',
    isDemo: true,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'msg_1_2',
    conversationId: 'conv_1',
    senderId: 'bot',
    senderName: 'Dream Hair & Beauty (AI)',
    messageText: 'Hello Priya! We are located at Telephone Maidan, Katwa. Feel free to visit or call us at 6294748025 if you need directions!',
    direction: 'outbound',
    messageType: 'text',
    status: 'ai_replied',
    isDemo: true,
    createdAt: new Date(Date.now() - 29 * 60000).toISOString()
  },
  {
    id: 'msg_1_3',
    conversationId: 'conv_1',
    senderId: 'ig_user_priya88',
    senderName: 'priya_sharma_wb',
    messageText: 'Thank you! I will visit this Saturday around 11 AM.',
    direction: 'inbound',
    messageType: 'text',
    status: 'received',
    isDemo: true,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'msg_2_1',
    conversationId: 'conv_2',
    senderId: 'ig_user_arjun_k',
    senderName: 'arjun_katwa_fit',
    messageText: 'Hey, I need to talk to a human staff member regarding wedding grooming.',
    direction: 'inbound',
    messageType: 'text',
    status: 'received',
    isDemo: true,
    createdAt: new Date(Date.now() - 50 * 60000).toISOString()
  },
  {
    id: 'msg_2_2',
    conversationId: 'conv_2',
    senderId: 'system',
    senderName: 'System',
    messageText: 'Customer requested a human agent. Conversation switched to Human Mode. AI auto-reply paused.',
    direction: 'outbound',
    messageType: 'system',
    status: 'human_replied',
    isDemo: true,
    createdAt: new Date(Date.now() - 49 * 60000).toISOString()
  },
  {
    id: 'msg_2_3',
    conversationId: 'conv_2',
    senderId: 'ig_user_arjun_k',
    senderName: 'arjun_katwa_fit',
    messageText: 'Can someone call me? I want to discuss a full groom package.',
    direction: 'inbound',
    messageType: 'text',
    status: 'received',
    isDemo: true,
    createdAt: new Date(Date.now() - 42 * 60000).toISOString()
  },
  {
    id: 'msg_3_1',
    conversationId: 'conv_3',
    senderId: 'ig_user_sneha_m',
    senderName: 'sneha_mukherjee',
    messageText: 'Hi, what is the price for keratin treatment?',
    direction: 'inbound',
    messageType: 'text',
    status: 'received',
    isDemo: true,
    createdAt: new Date(Date.now() - 112 * 60000).toISOString()
  },
  {
    id: 'msg_3_2',
    conversationId: 'conv_3',
    senderId: 'bot',
    senderName: 'Dream Hair & Beauty (AI)',
    messageText: 'Ladies Keratin (Any Length) ₹2999, Gents Keratin ₹1299 😊 Free consultation aache.',
    direction: 'outbound',
    messageType: 'text',
    status: 'ai_replied',
    isDemo: true,
    createdAt: new Date(Date.now() - 110 * 60000).toISOString()
  }
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_init',
    action: 'SYSTEM_BOOT',
    details: 'Instagram AI Auto Reply engine started. Production origin detection ready.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'log_account',
    action: 'INSTAGRAM_CONNECTED',
    details: 'Connected account @dream_hair_salon_katwa (ID: 17841400928374921).',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'log_ai_on',
    action: 'AI_AUTO_REPLY_ENABLED',
    details: 'AI Auto-reply activated with friendly response style and strict business knowledge grounding.',
    createdAt: new Date(Date.now() - 86000000).toISOString()
  }
];

class Database {
  private data: DatabaseSchema;
  private isSaving = false;
  private pendingSave = false;
  private bkCache: BusinessKnowledge | null = null;

  constructor() {
    this.data = this.load();
  }

  public invalidateBusinessKnowledgeCache(): void {
    this.bkCache = null;
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;

        // Requirement 1 & 8: Latest saved business knowledge is ALWAYS authoritative
        let businessKnowledge = (parsed.businessKnowledge && (parsed.businessKnowledge.servicePrices || []).length > 0)
          ? parsed.businessKnowledge
          : defaultBusinessKnowledge;

        // Ensure every service price in loaded businessKnowledge has id, aliases, isEnabled, and correct category
        if (businessKnowledge && businessKnowledge.servicePrices) {
          businessKnowledge.servicePrices = businessKnowledge.servicePrices.map((sp: any, idx: number) => {
            const id = sp.id || `sp_${idx}_${sp.service.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
            // Enforce official Hair Straightening category name
            let cat = sp.category;
            if (cat === 'Hair Smoothing' || (sp.service && sp.service.toLowerCase().includes('straightening'))) {
              cat = 'Hair Straightening';
            }
            return {
              ...sp,
              id,
              category: cat,
              isEnabled: sp.isEnabled !== false,
              aliases: Array.isArray(sp.aliases) && sp.aliases.length > 0 ? sp.aliases : defaultAliasesForService(sp.service),
              createdAt: sp.createdAt || new Date().toISOString(),
              updatedAt: sp.updatedAt || new Date().toISOString()
            };
          });
        }

        // Clean any old messages that might contain deprecated prices and guarantee valid ISO timestamps
        const nowIso = new Date().toISOString();
        const sanitizedMessages = (parsed.messages || initialMessages)
          .filter((m: any) => {
            // Drop false "Authorization Error" outbound failures that were accidentally injected into WhatsApp conversations
            if (m.conversationId?.startsWith('conv_wa_') && m.errorMessage?.includes('Authorization Error') && m.senderId === 'user_admin') {
              return false;
            }
            return true;
          })
          .map((m: any) => {
            let text = m.messageText || '';
            if (text.includes('₹150') || text.includes('₹800') || text.includes('₹2399')) {
              text = text
                .replace(/Men Haircut ₹150 theke start/g, 'Gents Hair Cut ₹99')
                .replace(/Hair Spa ₹800 theke start/g, 'Gents Hair Spa ₹399 theke start')
                .replace(/Botox ₹2399/g, 'Ladies Any Length Botox ₹2799, Gents Botox ₹1199')
                .replace(/₹150 - ₹250/g, '₹99')
                .replace(/₹800 - ₹1,400/g, '₹399 - ₹599')
                .replace(/₹2399/g, '₹2799');
            }

            let validIso = m.createdAt;
            if (!validIso || isNaN(new Date(validIso).getTime())) {
              validIso = m.timestamp && !isNaN(new Date(m.timestamp).getTime()) ? new Date(m.timestamp).toISOString() : nowIso;
            }

            const isWhatsApp = m.conversationId?.startsWith('conv_wa_') || m.channel === 'whatsapp';
            return {
              ...m,
              channel: isWhatsApp ? 'whatsapp' : 'instagram',
              messageText: text,
              createdAt: validIso,
              timestamp: validIso
            };
          });

        return {
          users: parsed.users || initialUsers,
          instagramAccount: parsed.instagramAccount || defaultInstagramAccount,
          whatsAppAccount: parsed.whatsAppAccount || defaultWhatsAppAccount,
          whatsAppSettings: parsed.whatsAppSettings || defaultWhatsAppSettings,
          conversations: (parsed.conversations || initialConversations).map((c: any) => {
            let snippet = c.lastMessageSnippet;
            if (snippet?.includes('₹150') || snippet?.includes('₹800') || snippet?.includes('₹2399')) {
              snippet = 'Gents Hair Cut ₹99, Ladies Hair Cut ₹249 😊';
            }
            let validLastAt = c.lastMessageAt;
            if (!validLastAt || isNaN(new Date(validLastAt).getTime())) {
              validLastAt = c.createdAt && !isNaN(new Date(c.createdAt).getTime()) ? c.createdAt : nowIso;
            }

            const isWhatsApp = c.id?.startsWith('conv_wa_') || c.channel === 'whatsapp';
            if (isWhatsApp) {
              const waPhone = (c.whatsAppCustomerId || c.customerPhone || c.instagramUserId || '').trim();
              return {
                ...c,
                channel: 'whatsapp' as const,
                instagramUserId: undefined, // Strip instagramUserId so WhatsApp NEVER collides with Instagram
                whatsAppCustomerId: waPhone,
                customerPhone: waPhone,
                lastMessageSnippet: snippet,
                lastMessageAt: validLastAt,
                updatedAt: c.updatedAt && !isNaN(new Date(c.updatedAt).getTime()) ? c.updatedAt : validLastAt,
                createdAt: c.createdAt && !isNaN(new Date(c.createdAt).getTime()) ? c.createdAt : validLastAt
              };
            }

            return {
              ...c,
              channel: 'instagram' as const,
              whatsAppCustomerId: undefined,
              customerPhone: undefined,
              lastMessageSnippet: snippet,
              lastMessageAt: validLastAt,
              updatedAt: c.updatedAt && !isNaN(new Date(c.updatedAt).getTime()) ? c.updatedAt : validLastAt,
              createdAt: c.createdAt && !isNaN(new Date(c.createdAt).getTime()) ? c.createdAt : validLastAt
            };
          }),
          messages: sanitizedMessages,
          aiSettings: parsed.aiSettings || defaultAiSettings,
          businessKnowledge,
          replyRules: parsed.replyRules || defaultReplyRules,
          webhookEvents: parsed.webhookEvents || [],
          auditLogs: parsed.auditLogs || initialAuditLogs,
          sessions: parsed.sessions || []
        };
      }
    } catch (err) {
      console.error('[DB] Failed to load db file, initializing defaults:', err);
    }

    const initialData: DatabaseSchema = {
      users: initialUsers,
      instagramAccount: defaultInstagramAccount,
      whatsAppAccount: defaultWhatsAppAccount,
      whatsAppSettings: defaultWhatsAppSettings,
      conversations: initialConversations,
      messages: initialMessages,
      aiSettings: defaultAiSettings,
      businessKnowledge: defaultBusinessKnowledge,
      replyRules: defaultReplyRules,
      webhookEvents: [],
      auditLogs: initialAuditLogs,
      sessions: []
    };

    this.saveDirect(initialData);
    return initialData;
  }

  private saveDirect(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Write error:', err);
    }
  }

  public async save(): Promise<void> {
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      this.saveDirect(this.data);
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        await this.save();
      }
    }
  }

  // --- Users & Sessions ---
  public getUser(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async createUser(user: User): Promise<User> {
    this.data.users.push(user);
    await this.save();
    return user;
  }

  public async createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    this.data.sessions.push({ token, userId, expiresAt });
    await this.save();
    return token;
  }

  public getSession(token: string): Session | undefined {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.data.sessions = this.data.sessions.filter(s => s.token !== token);
      this.save();
      return undefined;
    }
    return session;
  }

  public async deleteSession(token: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    await this.save();
  }

  // --- Instagram Account ---
  public getInstagramAccount(): InstagramAccount {
    return this.data.instagramAccount;
  }

  public async updateInstagramAccount(update: Partial<InstagramAccount>): Promise<InstagramAccount> {
    this.data.instagramAccount = { ...this.data.instagramAccount, ...update };
    await this.save();
    return this.data.instagramAccount;
  }

  // --- AI Settings ---
  public getAiSettings(): AiSettings {
    return this.data.aiSettings;
  }

  public async updateAiSettings(update: Partial<AiSettings>): Promise<AiSettings> {
    this.data.aiSettings = {
      ...this.data.aiSettings,
      ...update,
      updatedAt: new Date().toISOString()
    };
    await this.save();
    return this.data.aiSettings;
  }

  // --- Business Knowledge ---
  public getBusinessKnowledge(): BusinessKnowledge {
    if (!this.bkCache) {
      this.bkCache = JSON.parse(JSON.stringify(this.data.businessKnowledge));
    }
    return this.bkCache!;
  }

  public async updateBusinessKnowledge(update: Partial<BusinessKnowledge>): Promise<BusinessKnowledge> {
    this.data.businessKnowledge = {
      ...this.data.businessKnowledge,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.invalidateBusinessKnowledgeCache();
    await this.save();
    return this.getBusinessKnowledge();
  }

  // --- Services & Prices Management (Requirements 2, 3, 4, 7) ---
  public getServices(): ServicePriceItem[] {
    return this.getBusinessKnowledge().servicePrices || [];
  }

  public getServiceById(id: string): ServicePriceItem | undefined {
    return (this.getBusinessKnowledge().servicePrices || []).find(s => s.id === id);
  }

  public async addService(item: Partial<ServicePriceItem>): Promise<ServicePriceItem> {
    const newService: ServicePriceItem = {
      id: item.id || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      service: item.service || 'New Service',
      category: item.category || 'General',
      brand: item.brand,
      gender: item.gender || 'All',
      hairLength: item.hairLength,
      price: item.price || '₹0',
      description: item.description,
      aliases: item.aliases || [],
      isEnabled: item.isEnabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!this.data.businessKnowledge.servicePrices) {
      this.data.businessKnowledge.servicePrices = [];
    }
    this.data.businessKnowledge.servicePrices.push(newService);
    this.data.businessKnowledge.updatedAt = new Date().toISOString();
    this.invalidateBusinessKnowledgeCache();
    await this.save();
    return newService;
  }

  public async updateService(id: string, update: Partial<ServicePriceItem>): Promise<ServicePriceItem | null> {
    const prices = this.data.businessKnowledge.servicePrices || [];
    const idx = prices.findIndex(s => s.id === id);
    if (idx === -1) return null;
    prices[idx] = {
      ...prices[idx],
      ...update,
      id, // Preserve id
      updatedAt: new Date().toISOString()
    };
    this.data.businessKnowledge.servicePrices = prices;
    this.data.businessKnowledge.updatedAt = new Date().toISOString();
    this.invalidateBusinessKnowledgeCache();
    await this.save();
    return prices[idx];
  }

  public async deleteService(id: string): Promise<boolean> {
    const prices = this.data.businessKnowledge.servicePrices || [];
    const beforeLen = prices.length;
    this.data.businessKnowledge.servicePrices = prices.filter(s => s.id !== id);
    if (this.data.businessKnowledge.servicePrices.length !== beforeLen) {
      this.data.businessKnowledge.updatedAt = new Date().toISOString();
      this.invalidateBusinessKnowledgeCache();
      await this.save();
      return true;
    }
    return false;
  }

  public async toggleService(id: string): Promise<ServicePriceItem | null> {
    const prices = this.data.businessKnowledge.servicePrices || [];
    const item = prices.find(s => s.id === id);
    if (!item) return null;
    item.isEnabled = !item.isEnabled;
    item.updatedAt = new Date().toISOString();
    this.data.businessKnowledge.updatedAt = new Date().toISOString();
    this.invalidateBusinessKnowledgeCache();
    await this.save();
    return item;
  }

  // --- WhatsApp Account & Settings ---
  public getWhatsAppAccount(): WhatsAppAccount {
    if (!this.data.whatsAppAccount) {
      this.data.whatsAppAccount = { ...defaultWhatsAppAccount };
    }
    return this.data.whatsAppAccount;
  }

  public async updateWhatsAppAccount(update: Partial<WhatsAppAccount>): Promise<WhatsAppAccount> {
    this.data.whatsAppAccount = { ...this.getWhatsAppAccount(), ...update };
    await this.save();
    return this.data.whatsAppAccount;
  }

  public getWhatsAppSettings(): WhatsAppSettings {
    if (!this.data.whatsAppSettings) {
      this.data.whatsAppSettings = { ...defaultWhatsAppSettings };
    }
    return this.data.whatsAppSettings;
  }

  public async updateWhatsAppSettings(update: Partial<WhatsAppSettings>): Promise<WhatsAppSettings> {
    this.data.whatsAppSettings = {
      ...this.getWhatsAppSettings(),
      ...update,
      updatedAt: new Date().toISOString()
    };
    await this.save();
    return this.data.whatsAppSettings;
  }

  public getConversationByWhatsAppCustomerId(customerId: string, isDemo: boolean = false): Conversation | undefined {
    const cleanId = (customerId || '').replace(/[^0-9]/g, '');
    return this.data.conversations.find(
      c => c.channel === 'whatsapp' &&
           ((c.whatsAppCustomerId && c.whatsAppCustomerId.replace(/[^0-9]/g, '') === cleanId) ||
            (c.customerPhone && c.customerPhone.replace(/[^0-9]/g, '') === cleanId) ||
            (c.username && c.username.replace(/[^0-9]/g, '') === cleanId)) &&
           (isDemo ? Boolean(c.isDemo) : !c.isDemo)
    );
  }

  public async createWhatsAppConversation(data: {
    customerId: string;
    customerName?: string;
    isDemo?: boolean;
  }): Promise<Conversation> {
    const cleanPhone = data.customerId.trim();
    const newConv: Conversation = {
      id: `conv_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: 'whatsapp',
      instagramUserId: undefined, // CRITICAL: NEVER set instagramUserId for WhatsApp!
      whatsAppCustomerId: cleanPhone,
      customerPhone: cleanPhone,
      username: data.customerName || cleanPhone,
      customerName: data.customerName || cleanPhone,
      status: 'active',
      mode: 'ai',
      unreadCount: 0,
      lastMessageSnippet: '',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: data.isDemo ?? false
    };
    this.data.conversations.unshift(newConv);
    await this.save();
    return newConv;
  }

  // --- Reply Rules ---
  public getReplyRules(): ReplyRule[] {
    return [...this.data.replyRules].sort((a, b) => a.priority - b.priority);
  }

  public async addReplyRule(rule: Omit<ReplyRule, 'id' | 'createdAt'>): Promise<ReplyRule> {
    const newRule: ReplyRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    this.data.replyRules.push(newRule);
    await this.save();
    return newRule;
  }

  public async updateReplyRule(id: string, update: Partial<ReplyRule>): Promise<ReplyRule | null> {
    const idx = this.data.replyRules.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.replyRules[idx] = { ...this.data.replyRules[idx], ...update };
    await this.save();
    return this.data.replyRules[idx];
  }

  public async deleteReplyRule(id: string): Promise<boolean> {
    const lenBefore = this.data.replyRules.length;
    this.data.replyRules = this.data.replyRules.filter(r => r.id !== id);
    if (this.data.replyRules.length !== lenBefore) {
      await this.save();
      return true;
    }
    return false;
  }

  // --- Conversations & Messages ---
  public getConversations(channel?: 'instagram' | 'whatsapp'): Conversation[] {
    let list = [...this.data.conversations];
    if (channel === 'whatsapp') {
      list = list.filter(c => c.channel === 'whatsapp');
    } else if (channel === 'instagram') {
      list = list.filter(c => c.channel === 'instagram');
    } else {
      // Default: strictly Instagram so that WhatsApp conversations never leak into unspecified queries
      list = list.filter(c => c.channel === 'instagram');
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() || 0;
      return timeB - timeA;
    });
  }

  public getConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  public getConversationByInstagramUserId(igUserId: string): Conversation | undefined {
    return this.data.conversations.find(c => c.channel === 'instagram' && c.instagramUserId === igUserId);
  }

  public async createConversation(data: {
    instagramUserId: string;
    username: string;
    customerName?: string;
    isDemo?: boolean;
  }): Promise<Conversation> {
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: 'instagram', // CRITICAL: Immutable channel = instagram
      instagramUserId: data.instagramUserId,
      whatsAppCustomerId: undefined,
      username: data.username,
      customerName: data.customerName || data.username,
      status: 'active',
      mode: 'ai',
      unreadCount: 0,
      lastMessageSnippet: '',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: data.isDemo ?? false
    };
    this.data.conversations.unshift(newConv);
    await this.save();
    return newConv;
  }

  public async updateConversation(id: string, update: Partial<Conversation>): Promise<Conversation | null> {
    const idx = this.data.conversations.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.conversations[idx] = {
      ...this.data.conversations[idx],
      ...update,
      updatedAt: new Date().toISOString()
    };
    await this.save();
    return this.data.conversations[idx];
  }

  public getMessagesByConversationId(conversationId: string): Message[] {
    return this.data.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime() || 0;
        return timeA - timeB;
      });
  }

  public async addMessage(message: Omit<Message, 'id' | 'createdAt'> & { createdAt?: string; timestamp?: string }): Promise<Message> {
    const nowIso = new Date().toISOString();
    let finalCreatedAt = nowIso;
    const candidate = message.createdAt || message.timestamp;
    if (candidate) {
      const trimmed = String(candidate).trim();
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          finalCreatedAt = d.toISOString();
        }
      } else {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          finalCreatedAt = d.toISOString();
        }
      }
    }

    const newMsg: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: finalCreatedAt,
      timestamp: finalCreatedAt
    };
    this.data.messages.push(newMsg);

    // Update conversation metadata
    const conv = this.data.conversations.find(c => c.id === message.conversationId);
    if (conv) {
      conv.lastMessageSnippet = message.messageText;
      conv.lastMessageAt = finalCreatedAt;
      conv.updatedAt = finalCreatedAt;
      conv.lastActivityAt = finalCreatedAt;
      if (message.direction === 'inbound') {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
    }

    await this.save();
    return newMsg;
  }

  public async updateMessage(id: string, update: Partial<Message>): Promise<Message | null> {
    const idx = this.data.messages.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.messages[idx] = { ...this.data.messages[idx], ...update };
    await this.save();
    return this.data.messages[idx];
  }

  public getMessageByExternalId(externalId: string): Message | undefined {
    return this.data.messages.find(
      m => m.externalMessageId === externalId ||
           m.external_message_id === externalId ||
           m.instagramMessageId === externalId
    );
  }

  public getMessageByInstagramId(id: string): Message | undefined {
    return this.data.messages.find(
      m => m.instagramMessageId === id ||
           m.externalMessageId === id ||
           m.external_message_id === id
    );
  }

  // --- Duplicate Event Protection ---
  public isDuplicateEvent(externalEventId?: string, externalMessageId?: string): boolean {
    if (!externalEventId && !externalMessageId) return false;
    return this.data.webhookEvents.some(
      e => (externalEventId && e.externalEventId === externalEventId) ||
           (externalMessageId && e.externalMessageId === externalMessageId)
    );
  }

  public async recordWebhookEvent(event: Omit<WebhookEvent, 'id' | 'processedAt'>): Promise<WebhookEvent> {
    const newEvent: WebhookEvent = {
      ...event,
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      processedAt: new Date().toISOString()
    };
    // Keep max 500 recent events
    this.data.webhookEvents.unshift(newEvent);
    if (this.data.webhookEvents.length > 500) {
      this.data.webhookEvents.length = 500;
    }
    await this.save();
    return newEvent;
  }

  public async addWebhookEvent(event: {
    eventType: string;
    payload?: any;
    processed?: boolean;
    externalEventId?: string;
    externalMessageId?: string;
  }): Promise<WebhookEvent> {
    return this.recordWebhookEvent({
      externalEventId: event.externalEventId || `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      externalMessageId: event.externalMessageId,
      eventType: event.eventType || 'webhook',
      payloadSummary: typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload || {}).slice(0, 150),
      status: event.processed ? 'processed' : 'processed'
    });
  }

  // --- Audit Logs ---
  public async logAudit(action: string, details: string, ip?: string): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      details,
      ip,
      createdAt: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500;
    }
    await this.save();
    return newLog;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public getStats() {
    const today = new Date().toISOString().slice(0, 10);
    const totalConversations = this.data.conversations.length;
    const todayMessages = this.data.messages.filter(m => m.createdAt.startsWith(today)).length;
    const aiReplies = this.data.messages.filter(m => m.status === 'ai_replied').length;
    const humanReplies = this.data.messages.filter(m => m.status === 'human_replied' || (m.direction === 'outbound' && m.senderId !== 'bot' && m.senderId !== 'system')).length;
    const unansweredMessages = this.data.conversations.filter(c => c.unreadCount > 0).length;

    return {
      totalConversations,
      todayMessages,
      aiReplies,
      humanReplies,
      unansweredMessages
    };
  }

  public async resetDemoData() {
    this.data.conversations = JSON.parse(JSON.stringify(initialConversations));
    this.data.messages = JSON.parse(JSON.stringify(initialMessages));
    this.data.businessKnowledge = JSON.parse(JSON.stringify(defaultBusinessKnowledge));
    this.data.aiSettings = JSON.parse(JSON.stringify(defaultAiSettings));
    this.data.replyRules = JSON.parse(JSON.stringify(defaultReplyRules));
    await this.save();
  }
}

export const db = new Database();
export { hashPassword };
