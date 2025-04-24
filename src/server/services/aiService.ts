import axios from 'axios';
import { getFileBuffer, getFileMetadata } from './fileService';
import { processLectureSlides } from './geminiService';

// AI service implementation with Gemini integration
export const generateCleanNotes = async (fileId: string): Promise<string> => {
    try {
        // Get file metadata and buffer from in-memory storage
        const fileMetadata = getFileMetadata(fileId);
        const fileBuffer = getFileBuffer(fileId);
        
        if (!fileMetadata || !fileBuffer) {
            throw new Error('File not found in memory');
        }
        
        console.log(`Processing in-memory file: ${fileMetadata.originalName} (${fileMetadata.size} bytes)`);
        console.log(`File MIME type: ${fileMetadata.mimeType}`);
        
        try {
            // Use Gemini to process the slides
            console.log('Processing with Gemini AI...');
            const notes = await processLectureSlides(
                fileBuffer, 
                fileMetadata.mimeType, 
                fileMetadata.originalName
            );
            console.log('Gemini processing successful!');
            return notes;
        } catch (geminiError) {
            console.error('Error with Gemini processing:', geminiError);
            console.log('Falling back to mock data...');
            
            // Fallback to mock data if Gemini fails
            const fileName = fileMetadata.originalName;
            return `# Clean Notes for ${fileName}\n\n## Key Points\n\n- Important concept 1\n- Important concept 2\n- Important concept 3\n\n## Summary\n\nThese are automatically generated notes from the uploaded slide deck.\nFile type: ${fileMetadata.mimeType}\nFile size: ${(fileMetadata.size / 1024).toFixed(2)} KB\n\n**Note: These are mock notes because Gemini AI processing failed. Check server logs for details.**`;
        }
    } catch (error) {
        console.error('Error generating clean notes:', error);
        throw new Error('Failed to generate clean notes');
    }
};

// Mock notes generator to save API credits during testing
export const generateMockNotes = async (fileId: string): Promise<string> => {
    try {
        const fileMetadata = getFileMetadata(fileId);
        const fileBuffer = getFileBuffer(fileId);
        
        if (!fileMetadata || !fileBuffer) {
            throw new Error('File not found in memory');
        }
        
        console.log(`Generating enhanced mock notes for file: ${fileMetadata.originalName} (${fileMetadata.size} bytes)`);
        
        // Extract information from the file name to customize the mock notes
        const fileName = fileMetadata.originalName;
        const fileSize = (fileMetadata.size / 1024).toFixed(2);
        const fileType = fileMetadata.mimeType;
        const timestamp = new Date().toLocaleString();
        
        // Try to identify subject area from filename
        const subjectArea = identifySubjectArea(fileName);
        const topics = generateTopicsForSubject(subjectArea, fileName);
        const definitions = generateDefinitionsForSubject(subjectArea);
        const examples = generateExamplesForSubject(subjectArea);
        const equations = generateEquationsForSubject(subjectArea);
        
        // Generate rich mock notes with more detailed content based on identified subject
        return `# Lecture Notes: ${formatTitle(fileName)}

## Summary

This document contains structured notes from the lecture "${formatTitle(fileName)}". These notes cover the main concepts, definitions, and applications related to ${subjectArea.name}.

## Key Concepts

${topics.map(topic => `- **${topic.title}**: ${topic.description}`).join('\n')}

## Important Definitions

${definitions.map((def, i) => `${i+1}. **${def.term}**: ${def.definition}`).join('\n')}

## Examples & Applications

${examples.map((ex, i) => `### Example ${i+1}: ${ex.title}\n${ex.description}`).join('\n\n')}

## ${subjectArea.usesEquations ? 'Key Equations & Formulas' : 'Important Relationships'}

${equations.length > 0 ? '```\n' + equations.join('\n') + '\n```' : 'This topic focuses on conceptual relationships rather than mathematical equations.'}

## Study Questions

${generateQuestionsForSubject(subjectArea).map((q, i) => `${i+1}. ${q}`).join('\n')}

## Additional Resources

- Online tutorials for ${subjectArea.name}
- Reference textbooks on ${subjectArea.name}
- Practice problems related to ${topics.map(t => t.title).join(', ')}

---

*Document Information:*
- Source: ${fileName}
- Format: ${fileType}
- Size: ${fileSize} KB
- Generated: ${timestamp}
- Note: This content was generated in offline mode without AI processing.`;
    } catch (error) {
        console.error('Error generating mock notes:', error);
        throw new Error('Failed to generate mock notes');
    }
};

// Keep the existing aiService for client-side use
export const aiService = {
    convertSlidesToNotes: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.notes;
        } catch (error) {
            console.error('Error converting slides to notes:', error);
            throw new Error('Failed to convert slides to notes');
        }
    },
};

// Helper functions for generating more relevant mock notes
function formatTitle(fileName: string): string {
    // Remove extension and replace underscores/hyphens with spaces
    return fileName
        .replace(/\.[^/.]+$/, "")  // remove extension
        .replace(/[_-]/g, " ")     // replace underscores and hyphens with spaces
        .replace(/\b\w/g, (c) => c.toUpperCase());  // capitalize first letter of each word
}

interface Subject {
    name: string;
    keywords: string[];
    usesEquations: boolean;
}

function identifySubjectArea(fileName: string): Subject {
    const subjects: Subject[] = [
        {
            name: "Computer Science",
            keywords: ["algorithm", "data", "structure", "programming", "code", "software", "computer", "network", "database", "security", "web", "ai", "machine learning"],
            usesEquations: false
        },
        {
            name: "Mathematics",
            keywords: ["math", "calculus", "algebra", "geometry", "statistics", "probability", "theorem", "equation", "function", "matrix", "vector"],
            usesEquations: true
        },
        {
            name: "Physics",
            keywords: ["physics", "mechanic", "dynamic", "kinematic", "energy", "force", "motion", "quantum", "relativity", "electro", "magnet", "thermodynamic"],
            usesEquations: true
        },
        {
            name: "Chemistry",
            keywords: ["chemistry", "chemical", "reaction", "molecule", "atom", "bond", "organic", "inorganic", "solution", "acid", "base"],
            usesEquations: true
        },
        {
            name: "Biology",
            keywords: ["biology", "cell", "gene", "evolution", "ecology", "organism", "molecular", "anatomy", "physiology", "genetic"],
            usesEquations: false
        },
        {
            name: "Economics",
            keywords: ["economic", "market", "finance", "business", "micro", "macro", "profit", "cost", "supply", "demand"],
            usesEquations: true
        },
        {
            name: "Psychology",
            keywords: ["psychology", "behavior", "cognitive", "mental", "neuro", "development", "personality", "social", "emotion"],
            usesEquations: false
        }
    ];
    
    const fileNameLower = fileName.toLowerCase();
    
    // Find the subject with the most keyword matches
    let bestMatch = { subject: subjects[0], count: 0 };
    
    for (const subject of subjects) {
        const matchCount = subject.keywords.filter(keyword => 
            fileNameLower.includes(keyword)
        ).length;
        
        if (matchCount > bestMatch.count) {
            bestMatch = { subject, count: matchCount };
        }
    }
    
    // If no good matches, return a generic subject
    if (bestMatch.count === 0) {
        return {
            name: "Academic Study",
            keywords: [],
            usesEquations: false
        };
    }
    
    return bestMatch.subject;
}

interface Topic {
    title: string;
    description: string;
}

function generateTopicsForSubject(subject: Subject, fileName: string): Topic[] {
    const topics: Record<string, Topic[]> = {
        "Computer Science": [
            { title: "Algorithmic Complexity", description: "Analysis of time and space complexity of algorithms using Big O notation to measure efficiency." },
            { title: "Data Structures", description: "Implementation and applications of arrays, linked lists, trees, graphs, and hash tables for efficient data organization." },
            { title: "Object-Oriented Programming", description: "Design principles including encapsulation, inheritance, and polymorphism for modular software development." },
            { title: "Database Management", description: "Relational database design, normalization, and SQL queries for data storage and retrieval." },
            { title: "Network Architecture", description: "The OSI model, TCP/IP protocols, and client-server communications for networked systems." }
        ],
        "Mathematics": [
            { title: "Differential Calculus", description: "Concepts of limits, continuity, and derivatives for analyzing rates of change and optimization." },
            { title: "Linear Algebra", description: "Vector spaces, linear transformations, and matrix operations for solving systems of equations." },
            { title: "Probability Theory", description: "Random variables, probability distributions, and expected values for modeling uncertainty." },
            { title: "Graph Theory", description: "Properties of graphs, trees, and networks with applications to connectivity problems." },
            { title: "Number Theory", description: "Properties of integers, congruences, and prime numbers with applications to cryptography." }
        ],
        "Physics": [
            { title: "Classical Mechanics", description: "Newton's laws of motion, conservation of energy, and momentum for describing physical systems." },
            { title: "Electromagnetism", description: "Electric and magnetic fields, Maxwell's equations, and electromagnetic waves." },
            { title: "Thermodynamics", description: "Laws of thermodynamics, entropy, and heat transfer processes in physical systems." },
            { title: "Quantum Mechanics", description: "Wave-particle duality, uncertainty principle, and quantum states of subatomic particles." },
            { title: "Relativity", description: "Time dilation, length contraction, and mass-energy equivalence in Einstein's theories." }
        ],
        "Chemistry": [
            { title: "Chemical Bonding", description: "Ionic, covalent, and metallic bonds determining molecular structure and properties." },
            { title: "Reaction Kinetics", description: "Rates of chemical reactions, reaction mechanisms, and factors affecting reaction speed." },
            { title: "Acid-Base Equilibria", description: "pH, buffer solutions, and the behavior of acids and bases in aqueous solutions." },
            { title: "Organic Reactions", description: "Functional group transformations, reaction mechanisms, and synthesis strategies." },
            { title: "Thermochemistry", description: "Energy changes in chemical reactions, enthalpy, and calorimetry measurements." }
        ],
        "Biology": [
            { title: "Cell Structure and Function", description: "Organelles, membranes, and cellular processes essential for life." },
            { title: "Genetics and Inheritance", description: "DNA structure, gene expression, and patterns of inheritance in organisms." },
            { title: "Evolutionary Biology", description: "Natural selection, adaptation, and speciation in the diversity of life." },
            { title: "Ecology", description: "Interactions between organisms and their environment in ecosystems." },
            { title: "Physiology", description: "Organ systems, homeostasis, and functional processes in living organisms." }
        ],
        "Economics": [
            { title: "Supply and Demand", description: "Market forces determining prices and quantities in competitive markets." },
            { title: "Macroeconomic Indicators", description: "GDP, inflation, unemployment, and other measures of economic performance." },
            { title: "Monetary Policy", description: "Central bank operations, interest rates, and money supply management." },
            { title: "Market Structures", description: "Perfect competition, monopoly, oligopoly, and their effects on pricing and efficiency." },
            { title: "International Trade", description: "Comparative advantage, trade barriers, and global economic relationships." }
        ],
        "Psychology": [
            { title: "Cognitive Processes", description: "Perception, attention, memory, and decision-making in human thought." },
            { title: "Development", description: "Life-span changes in physical, cognitive, and social-emotional capabilities." },
            { title: "Social Influence", description: "Conformity, obedience, and group dynamics in human behavior." },
            { title: "Neuropsychology", description: "Brain structures and functions underlying psychological processes." },
            { title: "Research Methods", description: "Experimental design, statistical analysis, and ethical considerations in psychological research." }
        ],
        "Academic Study": [
            { title: "Foundational Principles", description: "Core concepts and frameworks that form the basis of understanding in this field." },
            { title: "Analytical Methods", description: "Approaches to analyzing and interpreting information within this domain." },
            { title: "Historical Development", description: "Evolution of key ideas and their significance in the broader context." },
            { title: "Applied Techniques", description: "Practical implementations and applications of theoretical knowledge." },
            { title: "Current Trends", description: "Recent developments and emerging directions in research and practice." }
        ]
    };
    
    // Select 3-5 topics based on the filename to ensure variety
    const availableTopics = topics[subject.name] || topics["Academic Study"];
    const selectedTopics: Topic[] = []; // Adding explicit type to fix the TypeScript error
    const numTopics = 3 + Math.floor(Math.random() * 3); // 3 to 5 topics
    
    // Try to include topics that might match the filename
    const fileNameLower = fileName.toLowerCase();
    
    for (const topic of availableTopics) {
        if (selectedTopics.length >= numTopics) break;
        
        const topicKeywords = topic.title.toLowerCase().split(' ');
        if (topicKeywords.some(keyword => fileNameLower.includes(keyword))) {
            selectedTopics.push(topic);
        }
    }
    
    // Fill with random topics if needed
    while (selectedTopics.length < numTopics) {
        const remainingTopics = availableTopics.filter(
            topic => !selectedTopics.includes(topic)
        );
        
        if (remainingTopics.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * remainingTopics.length);
        selectedTopics.push(remainingTopics[randomIndex]);
    }
    
    return selectedTopics;
}

interface Definition {
    term: string;
    definition: string;
}

function generateDefinitionsForSubject(subject: Subject): Definition[] {
    const definitions: Record<string, Definition[]> = {
        "Computer Science": [
            { term: "Algorithm", definition: "A step-by-step procedure for solving a problem or accomplishing a task in a finite amount of time." },
            { term: "Data Structure", definition: "A specialized format for organizing, processing, and storing data for efficient access and modification." },
            { term: "Object-Oriented Programming", definition: "A programming paradigm based on the concept of objects that contain data and code." },
            { term: "Recursion", definition: "A method where the solution to a problem depends on solutions to smaller instances of the same problem." },
            { term: "API (Application Programming Interface)", definition: "A set of definitions and protocols for building and integrating application software." }
        ],
        "Mathematics": [
            { term: "Function", definition: "A relation that assigns exactly one output to each input based on a specific rule." },
            { term: "Derivative", definition: "The rate at which a function changes at a particular point, representing the slope of the tangent line." },
            { term: "Vector", definition: "A quantity with both magnitude and direction, often represented as an arrow in space." },
            { term: "Eigenvalue", definition: "A scalar that, when multiplied by a specific vector, results in a vector parallel to the original." },
            { term: "Proof", definition: "A logical argument that establishes the truth of a mathematical statement beyond any doubt." }
        ],
        // Definitions for other subjects...
        "Academic Study": [
            { term: "Hypothesis", definition: "A proposed explanation for a phenomenon, based on limited evidence, that can be tested through further investigation." },
            { term: "Methodology", definition: "The systematic approach and procedures used to conduct research or analysis." },
            { term: "Theory", definition: "A well-substantiated explanation of some aspect of the natural world, based on a body of evidence." },
            { term: "Analysis", definition: "The process of breaking down a complex topic into smaller parts to gain a better understanding of it." },
            { term: "Synthesis", definition: "The combination of separate elements or components to form a coherent whole." }
        ]
    };
    
    // Return definitions for the subject or generic ones if not available
    return (definitions[subject.name] || definitions["Academic Study"]).slice(0, 4);
}

interface Example {
    title: string;
    description: string;
}

function generateExamplesForSubject(subject: Subject): Example[] {
    const examples: Record<string, Example[]> = {
        "Computer Science": [
            { title: "Binary Search Implementation", description: "An efficient algorithm for finding an item in a sorted list, with time complexity O(log n). This divide-and-conquer approach repeatedly divides the search interval in half." },
            { title: "Database Normalization", description: "The process of structuring a relational database to reduce data redundancy and improve data integrity. This example shows how to normalize a customer order database to 3NF." }
        ],
        "Mathematics": [
            { title: "Optimization Problem", description: "Finding the dimensions of a rectangular pen that maximizes area given a fixed perimeter. Using calculus, we find the derivative of the area function and set it equal to zero." },
            { title: "Eigenvalue Calculation", description: "Computing the eigenvalues and eigenvectors of a 2×2 matrix to understand its geometric transformation properties." }
        ],
        // Examples for other subjects...
        "Academic Study": [
            { title: "Research Design", description: "Creating an experimental setup to test a hypothesis while controlling for confounding variables and minimizing bias." },
            { title: "Data Analysis Case", description: "Applying statistical methods to interpret findings from a dataset, including visualization techniques and significance testing." }
        ]
    };
    
    // Return examples for the subject or generic ones if not available
    return (examples[subject.name] || examples["Academic Study"]).slice(0, 2);
}

function generateEquationsForSubject(subject: Subject): string[] {
    const equations: Record<string, string[]> = {
        "Computer Science": [
            "Time Complexity: O(n log n) - for efficient sorting algorithms",
            "Space Complexity: O(n) - linear space usage",
            "2^n - exponential growth pattern",
            "P vs NP Problem"
        ],
        "Mathematics": [
            "f'(x) = lim_{h→0} [f(x+h) - f(x)]/h - Definition of derivative",
            "∫ f(x) dx = F(x) + C - Indefinite integral",
            "e^(iπ) + 1 = 0 - Euler's identity",
            "ax² + bx + c = 0 → x = (-b ± √(b² - 4ac))/2a - Quadratic formula"
        ],
        "Physics": [
            "F = ma - Newton's Second Law",
            "E = mc² - Mass-energy equivalence",
            "PV = nRT - Ideal Gas Law",
            "F = G(m₁m₂)/r² - Gravitational force"
        ],
        "Chemistry": [
            "pH = -log[H+] - Definition of pH",
            "ΔG = ΔH - TΔS - Gibbs free energy",
            "K = [C]ᶜ[D]ᵈ/[A]ᵃ[B]ᵇ - Equilibrium constant",
            "Rate = k[A]ᵐ[B]ⁿ - Rate law"
        ],
        "Economics": [
            "MR = MC - Profit maximization condition",
            "PV = FV/(1+r)ⁿ - Present value",
            "Y = C + I + G + (X - M) - GDP equation",
            "Elasticity = (ΔQ/Q)/(ΔP/P) - Price elasticity"
        ],
        "Academic Study": [
            "Correlation coefficient: r = Σ((x - x̄)(y - ȳ))/√(Σ(x - x̄)²Σ(y - ȳ)²)",
            "Sample size calculation: n = (Z²σ²)/E²",
            "Statistical significance: p < 0.05",
            "Risk ratio: RR = (a/(a+b))/(c/(c+d))"
        ]
    };
    
    if (!subject.usesEquations) {
        return [];
    }
    
    // Return equations for the subject or generic ones if not available
    return (equations[subject.name] || equations["Academic Study"]).slice(0, 3);
}

function generateQuestionsForSubject(subject: Subject): string[] {
    const questions: Record<string, string[]> = {
        "Computer Science": [
            "How does the efficiency of bubble sort compare to quicksort for large datasets?",
            "What are the key differences between object-oriented and functional programming paradigms?",
            "How do hash tables implement efficient lookup operations?",
            "What security challenges arise when implementing a RESTful API?",
            "How does garbage collection work in modern programming languages?"
        ],
        "Mathematics": [
            "What is the relationship between differentiation and integration?",
            "How can linear algebra be applied to solve systems of differential equations?",
            "What is the significance of eigenvalues in matrix transformations?",
            "How does the central limit theorem apply to real-world statistical analysis?",
            "What are the applications of complex numbers in engineering problems?"
        ],
        // Questions for other subjects...
        "Academic Study": [
            "How does this topic connect to broader concepts in the field?",
            "What methodological approaches are most effective for researching this subject?",
            "How have perspectives on this topic evolved over time?",
            "What practical applications exist for these theoretical concepts?",
            "What ethical considerations are relevant to this area of study?"
        ]
    };
    
    // Return questions for the subject or generic ones if not available
    return (questions[subject.name] || questions["Academic Study"]).slice(0, 5);
}