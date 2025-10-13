// Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

// Fuzzy match function that checks if street name is similar enough
function fuzzyMatchStreet(searchTerm, streetArray, threshold = 2) {
  const searchLower = searchTerm.toLowerCase();
  
  // Check each street in the array
  for (const street of streetArray) {
    const streetLower = street.toLowerCase();
    
    // Direct substring match
    if (streetLower.includes(searchLower)) {
      return true;
    }
    
    // Split street name into individual words
    const words = street.toLowerCase().split(/[,\s]+/).filter(word => word.length > 2);
    
    // Check fuzzy match against each word in the street name
    for (const word of words) {
      const distance = levenshteinDistance(searchLower, word);
      const maxLength = Math.max(searchLower.length, word.length);
      
      // Allow distance based on word length, but cap at threshold
      const allowedDistance = Math.min(threshold, Math.floor(maxLength * 0.3));
      
      if (distance <= allowedDistance) {
        return true;
      }
    }
  }
  
  return false;
}

export { fuzzyMatchStreet, levenshteinDistance };