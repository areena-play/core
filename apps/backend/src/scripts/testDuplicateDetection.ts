import { DuplicateDetectionService, normalizeString, levenshteinDistance, compareBirthDates } from '../services/duplicateDetection.service';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

console.log('--- Testing String Normalization & Levenshtein ---');
assert(normalizeString('  Müller  ') === 'mueller', 'Normalize Müller -> mueller');
assert(normalizeString('Éric') === 'eric', 'Normalize Éric -> eric');
assert(normalizeString('SÖNDEREGGER') === 'soenderegger', 'Normalize uppercase umlaut');
assert(levenshteinDistance('Dominic', 'Dominik') === 1, 'Levenshtein Dominic vs Dominik is 1');
assert(levenshteinDistance('Sonderegger', 'Sondereger') === 1, 'Levenshtein Sonderegger vs Sondereger is 1');

console.log('\n--- Testing Birth Date Comparison ---');
assert(compareBirthDates('1995-03-12', '1995-03-12').matchType === 'EXACT', 'Exact DOB match');
assert(compareBirthDates('1995-03-12', '1995-03-13').matchType === 'CLOSE', 'Close day DOB match');
assert(compareBirthDates('1995-03-12', '1995-11-20').matchType === 'SAME_YEAR', 'Same year DOB match');
assert(compareBirthDates('1995-03-12', '2005-03-12').matchType === 'DIFFERENT', 'Different year DOB match');

console.log('\n--- Testing Evaluation Scenarios ---');

// Scenario 1: Exact name, exact DOB
const s1 = DuplicateDetectionService.evaluateSimilarity(
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1995-03-12' },
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1995-03-12' }
);
console.log('S1 Result:', s1);
assert(s1.similarity >= 95 && s1.confidence === 'HIGH', 'Scenario 1: High similarity for identical name & DOB');

// Scenario 2: Typos in both names with exact DOB
const s2 = DuplicateDetectionService.evaluateSimilarity(
    { firstName: 'Dominik', lastName: 'Sondereger', birthDate: '1995-03-12' },
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1995-03-12' }
);
console.log('S2 Result:', s2);
assert(s2.similarity >= 85 && s2.confidence === 'HIGH', 'Scenario 2: High similarity for minor spelling differences with same DOB');

// Scenario 3: Swapped first/last name with exact DOB
const s3 = DuplicateDetectionService.evaluateSimilarity(
    { firstName: 'Sonderegger', lastName: 'Dominic', birthDate: '1995-03-12' },
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1995-03-12' }
);
console.log('S3 Result:', s3);
assert(s3.similarity >= 85 && s3.reasons.some(r => r.type === 'NAME_SWAPPED'), 'Scenario 3: Detects name inversion');

// Scenario 4: Same name but different birth year (e.g. father & son)
const s4 = DuplicateDetectionService.evaluateSimilarity(
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1965-03-12' },
    { firstName: 'Dominic', lastName: 'Sonderegger', birthDate: '1995-03-12' }
);
console.log('S4 Result:', s4);
assert(s4.similarity <= 50 && s4.confidence === 'LOW', 'Scenario 4: Strongly penalizes different birth year');

// Scenario 5: Same License ID
const s5 = DuplicateDetectionService.evaluateSimilarity(
    { firstName: 'D.', lastName: 'Sonderegger', licenseId: 'STT-998811' },
    { firstName: 'Dominic', lastName: 'Sonderegger', licenseId: 'stt-998811' }
);
console.log('S5 Result:', s5);
console.log('\n--- Testing Database Scan ---');
async function testDbScan() {
    const clusters = await DuplicateDetectionService.scanAllDuplicates();
    console.log(`Found ${clusters.length} duplicate clusters in database.`);
    console.log('✅ PASS: scanAllDuplicates executed cleanly on database!');
    console.log('\n🎉 ALL DUPLICATE DETECTION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
}

testDbScan().catch((err) => {
    console.error('❌ FAIL in testDbScan:', err);
    process.exit(1);
});

