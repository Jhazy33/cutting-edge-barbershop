/**
 * Knowledge Base Ingestion Script
 *
 * Ingests comprehensive barbershop knowledge into the RAG system.
 */

import { addKnowledge, searchKnowledgeBaseOptimized } from '../services/memoryService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// KNOWLEDGE BASE DATA
// ============================================================================

const KNOWLEDGE_BASE = [
  // PRICING (6 entries)
  { category: 'pricing', content: 'Standard Haircut costs $31 for adults', metadata: { price: 31, service: 'haircut', type: 'adult' } },
  { category: 'pricing', content: 'Seniors and Kids Haircut costs $26', metadata: { price: 26, service: 'haircut', type: 'senior_kid' } },
  { category: 'pricing', content: 'Buzz Cut costs $21', metadata: { price: 21, service: 'buzz_cut' } },
  { category: 'pricing', content: 'Beard Trim costs $16', metadata: { price: 16, service: 'beard_trim' } },
  { category: 'pricing', content: 'Hair Design and Style varies by complexity', metadata: { service: 'hair_design', pricing: 'variable' } },
  { category: 'pricing', content: 'Shampoo and Cut includes wash and precision cut', metadata: { service: 'shampoo_cut', pricing: 'premium' } },

  // HOURS (3 entries)
  { category: 'hours', content: 'Monday-Friday: 9:00 AM - 7:00 PM', metadata: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], open: '09:00', close: '19:00' } },
  { category: 'hours', content: 'Saturday: 9:00 AM - 5:00 PM', metadata: { days: ['saturday'], open: '09:00', close: '17:00' } },
  { category: 'hours', content: 'Sunday: Closed', metadata: { days: ['sunday'], status: 'closed' } },

  // BARBERS (6 entries)
  { category: 'staff', content: 'Paul R. - Expert barber specializing in classic cuts', metadata: { name: 'Paul R.', specialty: 'classic_cuts', role: 'expert_barber' } },
  { category: 'staff', content: 'Brandon W. - Skilled in modern styles and fades', metadata: { name: 'Brandon W.', specialty: 'modern_styles_fades', role: 'barber' } },
  { category: 'staff', content: 'Kevin Lopes - Master barber with 20+ years experience', metadata: { name: 'Kevin Lopes', specialty: 'master_barber', experience: '20+_years', role: 'master_barber' } },
  { category: 'staff', content: 'Cameron - Specialist in textured hair and designs', metadata: { name: 'Cameron', specialty: 'textured_hair_designs', role: 'specialist' } },
  { category: 'staff', content: 'Rick - Traditional barber expert', metadata: { name: 'Rick', specialty: 'traditional', role: 'barber' } },
  { category: 'staff', content: 'Cody - Emerging talent, latest techniques', metadata: { name: 'Cody', specialty: 'latest_techniques', role: 'barber' } },

  // SERVICES (5 entries)
  { category: 'services', content: 'Haircuts for men, women, and children', metadata: { service_type: 'haircut', audience: ['men', 'women', 'children'] } },
  { category: 'services', content: 'Beard trims and grooming', metadata: { service_type: 'beard_grooming', audience: ['men'] } },
  { category: 'services', content: 'Buzz cuts and clipper cuts', metadata: { service_type: 'clipper_cuts', audience: ['men', 'children'] } },
  { category: 'services', content: 'Hair designs and styling', metadata: { service_type: 'styling', audience: ['men', 'women'] } },
  { category: 'services', content: 'Shampoo and conditioning treatments', metadata: { service_type: 'treatment', audience: ['all'] } },

  // POLICIES (4 entries)
  { category: 'policies', content: 'Walk-ins welcome but appointments recommended', metadata: { policy_type: 'appointments', walk_ins: 'welcome', appointments: 'recommended' } },
  { category: 'policies', content: 'Cash and major credit cards accepted', metadata: { policy_type: 'payment', methods: ['cash', 'credit_cards'] } },
  { category: 'policies', content: 'Cancellations require 24-hour notice', metadata: { policy_type: 'cancellations', notice: '24_hours' } },
  { category: 'policies', content: 'Children must be accompanied by adult', metadata: { policy_type: 'safety', requirement: 'adult_supervision' } },

  // FAQ (5 entries)
  { category: 'faq', content: 'How much does a haircut cost? Standard cut is $31, seniors/kids $26', metadata: { question: 'haircut_cost', answer_keywords: ['pricing', 'cost', 'haircut'] } },
  { category: 'faq', content: 'What are your hours? Mon-Fri 9AM-7PM, Sat 9AM-5PM, Sun closed', metadata: { question: 'hours', answer_keywords: ['hours', 'schedule', 'open'] } },
  { category: 'faq', content: 'Do I need an appointment? Walk-ins welcome but appointments recommended', metadata: { question: 'appointment_required', answer_keywords: ['appointment', 'walk_in'] } },
  { category: 'faq', content: 'Who are the barbers? Paul, Brandon, Kevin, Cameron, Rick, Cody', metadata: { question: 'barbers', answer_keywords: ['staff', 'barbers', 'team'] } },
  { category: 'faq', content: 'What services do you offer? Haircuts, beard trims, buzz cuts, styling', metadata: { question: 'services', answer_keywords: ['services', 'offerings'] } }
];

// ============================================================================
// INGESTION FUNCTION
// ============================================================================

async function ingestKnowledgeBase() {
  console.log('🚀 Starting knowledge base ingestion...\n');
  
  const SHOP_ID = 1;
  const SOURCE = 'ingestion_script';
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
    const entry = KNOWLEDGE_BASE[i];
    
    try {
      console.log(`[${i + 1}/${KNOWLEDGE_BASE.length}] Ingesting: ${entry.category} - ${entry.content.slice(0, 50)}...`);
      
      const id = await addKnowledge(
        SHOP_ID,
        entry.content,
        entry.category,
        SOURCE,
        {
          ...entry.metadata,
          created_date: new Date().toISOString(),
          batch_version: 'v1.0'
        }
      );
      
      console.log(`  ✅ Success: ${id}\n`);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const errorMsg = error.message;
      console.error(`  ❌ Error: ${errorMsg}\n`);
      errorCount++;
      errors.push({ entry, error: errorMsg });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total entries: ${KNOWLEDGE_BASE.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ entry, error }, index) => {
      console.log(`\n${index + 1}. ${entry.category}: ${entry.content}`);
      console.log(`   Error: ${error}`);
    });
  }

  if (errorCount > 0) {
    throw new Error(`${errorCount} entries failed to ingest`);
  }

  console.log('\n✨ Knowledge base ingestion completed successfully!\n');
}

// ============================================================================
// VERIFICATION FUNCTION
// ============================================================================

async function verifyKnowledgeBase() {
  console.log('🔍 Verifying knowledge base...\n');

  const expectedCounts = {
    pricing: 6,
    hours: 3,
    staff: 6,
    services: 5,
    policies: 4,
    faq: 5
  };

  const SHOP_ID = 1;

  for (const [category, expected] of Object.entries(expectedCounts)) {
    try {
      const results = await searchKnowledgeBaseOptimized(
        category,
        SHOP_ID,
        expected + 5,
        category,
        0.5
      );

      const actual = results.length;
      const status = actual === expected ? '✅' : '⚠️';
      
      console.log(`${status} ${category.padEnd(10)} Expected: ${expected}, Actual: ${actual}`);
    } catch (error) {
      console.log(`❌ ${category.padEnd(10)} Verification failed: ${error.message}`);
    }
  }

  console.log('\n✨ Verification complete!\n');
}

// ============================================================================
// TEST SEARCH FUNCTION
// ============================================================================

async function testSearch() {
  console.log('🧪 Testing vector search...\n');

  const SHOP_ID = 1;
  const testQueries = [
    { query: 'How much does a haircut cost?', category: 'pricing' },
    { query: 'What are your hours today?', category: 'hours' },
    { query: 'Who can cut my hair?', category: 'staff' },
    { query: 'Do I need an appointment?', category: 'policies' }
  ];

  for (const { query, category } of testQueries) {
    try {
      console.log(`Query: "${query}"`);
      const results = await searchKnowledgeBaseOptimized(
        query,
        SHOP_ID,
        3,
        category,
        0.7
      );

      if (results.length > 0) {
        console.log(`  ✅ Found ${results.length} result(s):`);
        results.forEach((result, index) => {
          console.log(`    ${index + 1}. [${result.similarity.toFixed(3)}] ${result.content.slice(0, 60)}...`);
        });
      } else {
        console.log(`  ⚠️  No results found above threshold 0.7`);
      }
      console.log('');
    } catch (error) {
      console.error(`  ❌ Search failed: ${error.message}\n`);
    }
  }

  console.log('✨ Search testing complete!\n');
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CUTTING EDGE - KNOWLEDGE BASE INGESTION');
    console.log('='.repeat(60) + '\n');

    await ingestKnowledgeBase();
    await verifyKnowledgeBase();
    await testSearch();

    console.log('✨ All tasks completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
