/* ===================================
   DESAFIA BRASIL - FIREBASE CONFIG
   Configuração do Firebase Firestore
   ================================== */

const admin = require('firebase-admin');

// Configuração do Firebase (substitua pelas suas credenciais)
const firebaseConfig = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Inicializar Firebase Admin
let db;
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
            databaseURL: `https://${firebaseConfig.project_id}-default-rtdb.firebaseio.com`
        });
    }
    
    db = admin.firestore();
    console.log('✅ Firebase Firestore conectado com sucesso!');
    
} catch (error) {
    console.error('❌ Erro ao conectar com Firebase:', error.message);
    console.log('⚠️ Executando em modo local sem banco de dados');
    db = null;
}

// Configurações do Firestore
if (db) {
    // Configurar timezone
    db.settings({
        timestampsInSnapshots: true
    });
}

// Coleções do Firestore
const collections = {
    USERS: 'users',
    QUESTIONS: 'questions', 
    EXAMS: 'exams',
    RESULTS: 'results',
    RANKINGS: 'rankings',
    ADMIN_LOGS: 'admin_logs'
};

// Funções utilitárias para Firestore
const FirestoreUtils = {
    // Converter timestamp do Firestore para Date
    timestampToDate: (timestamp) => {
        if (!timestamp) return null;
        return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    },
    
    // Converter Date para timestamp do Firestore
    dateToTimestamp: (date) => {
        if (!date) return null;
        return admin.firestore.Timestamp.fromDate(new Date(date));
    },
    
    // Adicionar timestamps automáticos
    addTimestamps: (data, isUpdate = false) => {
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        if (isUpdate) {
            return {
                ...data,
                updatedAt: now
            };
        } else {
            return {
                ...data,
                createdAt: now,
                updatedAt: now
            };
        }
    },
    
    // Incrementar contador
    increment: (value = 1) => admin.firestore.FieldValue.increment(value),
    
    // Array union
    arrayUnion: (...elements) => admin.firestore.FieldValue.arrayUnion(...elements),
    
    // Array remove
    arrayRemove: (...elements) => admin.firestore.FieldValue.arrayRemove(...elements)
};

// Classe Database para operações CRUD
class Database {
    constructor() {
        this.db = db;
        this.collections = collections;
        this.utils = FirestoreUtils;
    }
    
    // Verificar se o Firestore está conectado
    isConnected() {
        return this.db !== null;
    }
    
    // Buscar documento por ID
    async findById(collection, id) {
        if (!this.db) return null;
        
        try {
            const doc = await this.db.collection(collection).doc(id).get();
            if (!doc.exists) return null;
            
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`Erro ao buscar documento ${id}:`, error);
            return null;
        }
    }
    
    // Buscar documentos com filtros
    async find(collection, filters = {}, options = {}) {
        if (!this.db) return [];
        
        try {
            let query = this.db.collection(collection);
            
            // Aplicar filtros
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null) {
                    query = query.where(key, '==', filters[key]);
                }
            });
            
            // Aplicar ordenação
            if (options.orderBy) {
                const { field, direction = 'asc' } = options.orderBy;
                query = query.orderBy(field, direction);
            }
            
            // Aplicar limite
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const snapshot = await query.get();
            const results = [];
            
            snapshot.forEach(doc => {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return results;
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
            return [];
        }
    }
    
    // Criar documento
    async create(collection, data) {
        if (!this.db) return null;
        
        try {
            const docData = this.utils.addTimestamps(data);
            const docRef = await this.db.collection(collection).add(docData);
            
            return {
                id: docRef.id,
                ...docData
            };
        } catch (error) {
            console.error('Erro ao criar documento:', error);
            return null;
        }
    }
    
    // Atualizar documento
    async update(collection, id, data) {
        if (!this.db) return null;
        
        try {
            const docData = this.utils.addTimestamps(data, true);
            await this.db.collection(collection).doc(id).update(docData);
            
            // Retornar documento atualizado
            return await this.findById(collection, id);
        } catch (error) {
            console.error('Erro ao atualizar documento:', error);
            return null;
        }
    }
    
    // Deletar documento
    async delete(collection, id) {
        if (!this.db) return false;
        
        try {
            await this.db.collection(collection).doc(id).delete();
            return true;
        } catch (error) {
            console.error('Erro ao deletar documento:', error);
            return false;
        }
    }
    
    // Contar documentos
    async count(collection, filters = {}) {
        if (!this.db) return 0;
        
        try {
            let query = this.db.collection(collection);
            
            // Aplicar filtros
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null) {
                    query = query.where(key, '==', filters[key]);
                }
            });
            
            const snapshot = await query.get();
            return snapshot.size;
        } catch (error) {
            console.error('Erro ao contar documentos:', error);
            return 0;
        }
    }
    
    // Busca com paginação
    async paginate(collection, filters = {}, options = {}) {
        if (!this.db) return { data: [], total: 0, page: 1, totalPages: 1 };
        
        const { page = 1, limit = 10, orderBy } = options;
        const offset = (page - 1) * limit;
        
        try {
            let query = this.db.collection(collection);
            
            // Aplicar filtros
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null) {
                    query = query.where(key, '==', filters[key]);
                }
            });
            
            // Contar total
            const totalSnapshot = await query.get();
            const total = totalSnapshot.size;
            
            // Aplicar ordenação
            if (orderBy) {
                const { field, direction = 'asc' } = orderBy;
                query = query.orderBy(field, direction);
            }
            
            // Aplicar paginação
            query = query.offset(offset).limit(limit);
            
            const snapshot = await query.get();
            const data = [];
            
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                data,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrevious: page > 1
            };
        } catch (error) {
            console.error('Erro na paginação:', error);
            return { data: [], total: 0, page: 1, totalPages: 1 };
        }
    }
}

// Instância única do Database
const database = new Database();

module.exports = {
    db,
    admin,
    database,
    collections,
    FirestoreUtils
};
