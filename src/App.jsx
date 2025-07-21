import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    updateDoc, 
    query, 
    where,
    serverTimestamp,
    getDocs,
    setDoc
} from 'firebase/firestore';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'firebase/storage';
import { 
    LayoutDashboard, 
    FileText, 
    Users, 
    LogOut, 
    PlusCircle, 
    ChevronRight, 
    UploadCloud, 
    AlertCircle, 
    ShieldCheck, 
    Clock,
    Mail,
    Key,
    UserPlus,
    ArrowRight
} from 'lucide-react';

// --- Firebase Configuration ---
// IMPORTANT: This configuration is provided by the environment.
// Do not change these lines.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "AIza...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-contract-app';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                setUser(user);
                // Fetch user role from Firestore
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUserData({ id: doc.id, ...doc.data() });
                    } else {
                        // This case might happen if user is created in Auth but not in Firestore
                        console.log("No such user document!");
                        setUserData(null);
                    }
                    setLoading(false);
                });
                return () => unsubscribeUser();
            } else {
                // User is signed out
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-slate-100"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            {user && userData ? <MainApplication user={user} userData={userData} /> : <Login />}
        </div>
    );
}

// --- Login Component ---
function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/operation-not-allowed') {
                setError('Erro de configuração: O login por e-mail/senha não está habilitado no seu projeto Firebase. Por favor, ative-o no Console do Firebase > Authentication > Sign-in method.');
            } else {
                setError('Falha ao entrar. Verifique seu e-mail e senha.');
            }
            console.error("Login Error:", error);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold text-center text-gray-800">Gestor de Contratos</h2>
                <p className="text-center text-gray-500">Acesse sua conta para continuar</p>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-mail"
                            required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha"
                            required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
                    >
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// --- Main Application Layout ---
function MainApplication({ user, userData }) {
    const [activeView, setActiveView] = useState('dashboard'); // dashboard, security

    return (
        <div className="flex h-screen">
            <Sidebar activeView={activeView} setActiveView={setActiveView} userData={userData} />
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                {activeView === 'dashboard' && <Dashboard userData={userData} />}
                {activeView === 'security' && userData.role === 'diretor' && <SecurityPanel />}
            </main>
        </div>
    );
}

// --- Sidebar Navigation ---
function Sidebar({ activeView, setActiveView, userData }) {
    const handleLogout = async () => {
        await signOut(auth);
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...(userData.role === 'diretor' ? [{ id: 'security', label: 'Segurança', icon: Users }] : [])
    ];

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-blue-600">ContratosPRO</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center px-4 py-3 text-left text-gray-600 rounded-lg transition-colors ${
                            activeView === item.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-gray-100'
                        }`}
                    >
                        <item.icon className="mr-3" size={20} />
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
                <div className="px-4 py-3 mb-2">
                    <p className="text-sm font-semibold text-gray-700">{userData.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{userData.role}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="mr-3" size={20} />
                    Sair
                </button>
            </div>
        </div>
    );
}

// --- Process Stages Configuration ---
const STAGES = {
    iniciacao: { label: 'Iniciação', color: 'bg-gray-500' },
    especificacao: { label: 'Especificação Técnica', color: 'bg-cyan-500' },
    analise_contratos: { label: 'Análise de Contratos', color: 'bg-blue-500' },
    analise_juridica: { label: 'Análise Jurídica', color: 'bg-indigo-500' },
    autorizacao: { label: 'Autorização', color: 'bg-purple-500' },
    licitacao: { label: 'Licitação', color: 'bg-orange-500' },
    homologacao: { label: 'Homologação', color: 'bg-amber-500' },
    contratacao: { label: 'Contratação', color: 'bg-lime-500' },
    finalizado: { label: 'Finalizado', color: 'bg-green-500' },
};

const STAGE_ORDER = Object.keys(STAGES);

// --- Dashboard Component ---
function Dashboard({ userData }) {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState(null);

    useEffect(() => {
        let q;
        if (userData.role === 'diretor') {
            q = query(collection(db, `artifacts/${appId}/public/data/processes`));
        } else {
            q = query(collection(db, `artifacts/${appId}/public/data/processes`), where("assignedTo", "==", userData.id));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const procs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProcesses(procs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData]);

    const kpis = useMemo(() => {
        const total = processes.length;
        const delayed = processes.filter(p => p.deadlines?.final && new Date(p.deadlines.final) < new Date()).length;
        const onTime = total - delayed;
        return { total, delayed, onTime };
    }, [processes]);

    const openProcessDetails = (proc) => {
        setSelectedProcess(proc);
    };
    
    const closeProcessDetails = () => {
        setSelectedProcess(null);
    }

    if (loading) {
        return <div className="text-center p-10">Carregando processos...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    <PlusCircle size={20} />
                    Novo Processo
                </button>
            </div>

            {userData.role === 'diretor' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-white rounded-xl shadow-md flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full"><FileText className="text-blue-500" size={24}/></div>
                        <div>
                            <p className="text-3xl font-bold text-gray-800">{kpis.total}</p>
                            <p className="text-gray-500">Processos Totais</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-md flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full"><ShieldCheck className="text-green-500" size={24}/></div>
                        <div>
                            <p className="text-3xl font-bold text-gray-800">{kpis.onTime}</p>
                            <p className="text-gray-500">Dentro do Prazo</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-md flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full"><AlertCircle className="text-red-500" size={24}/></div>
                        <div>
                            <p className="text-3xl font-bold text-gray-800">{kpis.delayed}</p>
                            <p className="text-gray-500">Processos Atrasados</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Lista de Processos</h3>
                <div className="space-y-3">
                    {processes.length > 0 ? processes.map(proc => (
                        <div key={proc.id} onClick={() => openProcessDetails(proc)} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div>
                                <p className="font-semibold text-gray-800">{proc.title}</p>
                                <p className="text-sm text-gray-500">Nº: {proc.processNumber}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${STAGES[proc.currentStage]?.color || 'bg-gray-400'}`}>
                                    {STAGES[proc.currentStage]?.label || 'Desconhecida'}
                                </span>
                                <ChevronRight className="text-gray-400" />
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-10">Nenhum processo encontrado.</p>
                    )}
                </div>
            </div>

            {isModalOpen && <NewProcessModal onClose={() => setIsModalOpen(false)} userData={userData} />}
            {selectedProcess && <ProcessDetailModal process={selectedProcess} onClose={closeProcessDetails} userData={userData} />}
        </div>
    );
}

// --- New Process Modal ---
function NewProcessModal({ onClose, userData }) {
    const [title, setTitle] = useState('');
    const [processNumber, setProcessNumber] = useState('');
    const [deadline, setDeadline] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/processes`), {
                title,
                processNumber,
                currentStage: 'iniciacao',
                status: 'em_andamento',
                createdBy: userData.id,
                assignedTo: userData.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                deadlines: { final: deadline },
                history: [{
                    stage: 'iniciacao',
                    changedBy: userData.name,
                    timestamp: new Date(),
                    notes: 'Processo criado.'
                }],
                documents: []
            });
            onClose();
        } catch (error) {
            console.error("Error creating process:", error);
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Novo Processo de Contratação</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Título do Contrato" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded"/>
                    <input type="text" placeholder="Número do Processo" value={processNumber} onChange={e => setProcessNumber(e.target.value)} required className="w-full p-2 border rounded"/>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo Final</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required className="w-full p-2 border rounded"/>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">{isLoading ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Process Detail Modal ---
function ProcessDetailModal({ process, onClose, userData }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
        const fetchUsers = async () => {
             const usersCollection = collection(db, "users");
             const userSnapshot = await getDocs(usersCollection);
             const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             setUsers(userList);
        };
        fetchUsers();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const storageRef = ref(storage, `processes/${process.id}/${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const processRef = doc(db, `artifacts/${appId}/public/data/processes`, process.id);
            const newDocument = { name: file.name, url: downloadURL, uploadedAt: new Date(), uploadedBy: userData.name };
            
            await updateDoc(processRef, {
                documents: [...(process.documents || []), newDocument]
            });

            setFile(null);
        } catch (error) {
            console.error("Upload error:", error);
        }
        setUploading(false);
    };

    const handleAdvanceStage = async (newStage, assignedToId) => {
        if (!newStage) return;
        const processRef = doc(db, `artifacts/${appId}/public/data/processes`, process.id);
        const newHistoryEntry = {
            stage: newStage,
            changedBy: userData.name,
            timestamp: new Date(),
            notes: `Processo avançado para ${STAGES[newStage].label}.`
        };
        try {
            await updateDoc(processRef, {
                currentStage: newStage,
                assignedTo: assignedToId || process.assignedTo,
                updatedAt: serverTimestamp(),
                history: [...(process.history || []), newHistoryEntry]
            });
        } catch (error) {
            console.error("Error advancing stage:", error);
        }
    };

    const currentStageIndex = STAGE_ORDER.indexOf(process.currentStage);
    const nextStage = currentStageIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentStageIndex + 1] : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl h-5/6 flex flex-col">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{process.title}</h3>
                        <p className="text-gray-500">Nº: {process.processNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">&times;</button>
                </div>
                
                <div className="mt-4 flex-1 overflow-y-auto pr-2">
                    {/* Documents Section */}
                    <div className="mb-6">
                        <h4 className="font-semibold text-lg mb-2">Documentos</h4>
                        <div className="p-4 border-2 border-dashed rounded-lg">
                            <div className="flex gap-4">
                                <input type="file" onChange={handleFileChange} className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                <button onClick={handleUpload} disabled={!file || uploading} className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-md disabled:bg-gray-300">
                                    <UploadCloud size={16}/> {uploading ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </div>
                        <ul className="mt-4 space-y-2">
                            {process.documents?.map((doc, index) => (
                                <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{doc.name}</a>
                                    <span className="text-xs text-gray-400">por {doc.uploadedBy}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* History Section */}
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Histórico</h4>
                        <ul className="space-y-4 border-l-2 border-gray-200 ml-2">
                            {process.history?.sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map((item, index) => (
                                <li key={index} className="relative pl-8">
                                    <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-2 border-gray-300 rounded-full"></div>
                                    <p className="font-semibold">{STAGES[item.stage]?.label}</p>
                                    <p className="text-sm text-gray-600">{item.notes}</p>
                                    <p className="text-xs text-gray-400">{item.changedBy} em {new Date(item.timestamp.seconds * 1000).toLocaleString()}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t">
                    {nextStage && (
                        <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600">Próxima Etapa:</span>
                            <button onClick={() => handleAdvanceStage(nextStage)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                {STAGES[nextStage].label} <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Security Panel Component ---
function SecurityPanel() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    useEffect(() => {
        const usersCollection = collection(db, "users");
        const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const handleRoleChange = async (userId, newRole) => {
        const userRef = doc(db, "users", userId);
        try {
            await updateDoc(userRef, { role: newRole });
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    if (isLoading) return <div>Carregando usuários...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Segurança e Usuários</h2>
                <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    <UserPlus size={20} />
                    Convidar Usuário
                </button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-4">Nome</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Perfil</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">{user.name}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="p-2 border rounded-md bg-white"
                                        >
                                            <option value="equipe">Equipe</option>
                                            <option value="diretor">Diretor</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isInviteModalOpen && <InviteUserModal onClose={() => setIsInviteModalOpen(false)} />}
        </div>
    );
}

function InviteUserModal({ onClose }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('equipe');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // NOTE: In a real app, you might send an invite link.
            // For simplicity here, we create the user directly.
            // This requires a secure environment or a temporary password system.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Now, create the user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: role
            });

            onClose();
        } catch (error) {
            if (error.code === 'auth/operation-not-allowed') {
                setError('Erro de configuração: A criação de usuários por e-mail/senha não está habilitada no seu projeto Firebase.');
            } else {
                setError('Erro ao criar usuário. O e-mail já pode estar em uso.');
            }
            console.error("Invitation Error:", error);
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Convidar Novo Usuário</h3>
                <form onSubmit={handleInvite} className="space-y-4">
                    <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded"/>
                    <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded"/>
                    <input type="password" placeholder="Senha Temporária" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 border rounded"/>
                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="equipe">Equipe</option>
                        <option value="diretor">Diretor</option>
                    </select>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">{isLoading ? 'Convidando...' : 'Convidar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
