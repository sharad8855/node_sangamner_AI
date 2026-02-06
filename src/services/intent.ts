import { pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger';

class IntentClassifier {
    private model: any;
    private intentMap: Record<string, string[]>;
    private allPhrases: string[];
    private keyMapping: string[];
    private encodedCorpus: any;
    private isReady: boolean = false;
    private embeddingSize = 384;

    constructor() {
        this.intentMap = {
            "hospital": ["I need a doctor", "Where is the hospital", "medical shop near me", "mala potat dukhatay", "treatment pahije", "emergency service", "ambulance"],
            "restaurant": ["best hotel for dinner", "I am hungry", "chaha kuthe milel", "food delivery", "restaurant family sathi", "nashta center", "cafe"],
            "school": ["admission for kids", "best college in sangamner", "coaching classes", "english medium school", "education"],
            "petrol_pump": ["fuel station", "petrol pump near me", "diesel rate", "gadi madhe petrol bharaycha aahe"],
            "atm": ["cash withdrawal", "atm machine", "bank branch", "money transfer", "paisa kadhaycha aahe"],
            "garage": ["car repair", "bike puncture", "mechanic shop", "air filling station", "gadi kharab zali", "repair"],
            "shop": ["grocery store", "shopping mall", "buy clothes", "market", "dukan", "general store", "shopping"],
            "general_chat": ["just casual talking", "greeting the assistant", "asking about identity", "how are you doing", "thanking someone", "hi", "hello", "good morning"]
        };

        this.allPhrases = [];
        this.keyMapping = [];

        for (const [key, phrases] of Object.entries(this.intentMap)) {
            for (const phrase of phrases) {
                this.allPhrases.push(phrase);
                this.keyMapping.push(key);
            }
        }

        // Initialize implicitly
        this.loadModel();
    }

    private async loadModel() {
        try {
            logger.info("🚀 Loading AI Intent Model (Multilingual)...");
            // Use feature-extraction pipeline. 
            // 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' is the correct model ID.
            this.model = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');

            // Encode corpus
            logger.info("Encoding corpus...");
            const output = await this.model(this.allPhrases, { pooling: 'mean', normalize: true });
            this.encodedCorpus = output;

            this.isReady = true;
            logger.info("✅ Intent Model Loaded Successfully!");
        } catch (error) {
            logger.error(error, "Failed to load Intent Model");
        }
    }

    public async getIntent(query: string, threshold = 0.35): Promise<{ intent: string, score: number }> {
        if (!this.isReady) {
            logger.warn("Intent model not ready, returning fallback");
            return { intent: "general_chat", score: 0 };
        }

        // Encode query
        const output = await this.model(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = output.data; // Float32Array

        let maxScore = -1;
        let bestIdx = -1;

        const corpusData = this.encodedCorpus.data;
        const numPhrases = this.allPhrases.length;

        // Perform dot product (cosine similarity since vectors are normalized)
        for (let i = 0; i < numPhrases; i++) {
            const start = i * this.embeddingSize;

            let dot = 0;
            for (let j = 0; j < this.embeddingSize; j++) {
                dot += queryEmbedding[j] * corpusData[start + j];
            }

            if (dot > maxScore) {
                maxScore = dot;
                bestIdx = i;
            }
        }

        if (maxScore < threshold) {
            return { intent: "general_chat", score: maxScore };
        }

        return { intent: this.keyMapping[bestIdx], score: maxScore };
    }
}

export const intentClassifier = new IntentClassifier();
