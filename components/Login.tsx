import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FunnelIcon } from './icons';
import { toast } from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';



interface LoginProps {
    onSwitchView: () => void;
    initialView?: View;
    onRecoveryComplete?: () => void;
}

type View = 'login' | 'forgot_password' | 'update_password';

const Login: React.FC<LoginProps> = ({ onSwitchView, initialView = 'login', onRecoveryComplete }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>(initialView);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [debugLog, setDebugLog] = useState('');

    React.useEffect(() => {
        setView(initialView);
    }, [initialView]);

    React.useEffect(() => {
        let logStr = "Iniciando diagnóstico...\n";

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            logStr += `Evento Supabase: ${event}\n`;
            setDebugLog(logStr);
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.href.includes('type=recovery'))) {
                setIsSessionReady(true);
                setIsVerifying(false);
            }
        });

        const forceCheck = async () => {
            let logStr = "Iniciando diagnóstico profundo...\n";
            const hash = window.location.hash;

            const { data: getSessionData } = await supabase.auth.getSession();
            logStr += `Sessão ativa: ${getSessionData.session ? 'Sim' : 'Não'}\n`;

            if (hash && hash.includes('access_token')) {
                // Transforma qualquer '#' ou '?' em '&' e limpa os '&' no começo da string
                const safeHash = hash.replace(/[#?]/g, '&').replace(/^&+/, '');
                const params = new URLSearchParams(safeHash);
                
                const access = params.get('access_token');
                const refresh = params.get('refresh_token');

                logStr += `Access Token: ${access ? 'Encontrado' : 'Faltando'}\n`;
                logStr += `Refresh Token: ${refresh ? 'Encontrado' : 'Faltando'}\n`;

                if (access) {
                    logStr += "Forçando setSession...\n";
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: access,
                        refresh_token: refresh ? refresh : access 
                    });

                    logStr += `Resultado setSession: ${setSessionError ? setSessionError.message : 'Sucesso!'}\n`;

                    if (!setSessionError) {
                        setIsSessionReady(true);
                        setIsVerifying(false);
                    }
                }
            } else {
                logStr += "Nenhum token encontrado na URL.\n";
            }

            setDebugLog(prev => prev + "\n" + logStr);
        };

        forceCheck();

        const timeout = setTimeout(() => {
            setIsVerifying(false);
        }, 4000);

        return () => {
            authListener.subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error: any) {
            const errorMessage = error.message && error.message.includes('Email not confirmed')
                ? 'Por favor, confirme seu e-mail antes de entrar.'
                : error.error_description || error.message || "Ocorreu um erro ao entrar.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#type=recovery`,
            });
            if (error) throw error;
            toast.success('Link de recuperação enviado para seu e-mail!');
            setView('login');
        } catch (error: any) {
            const errorMessage = error.error_description || error.message || "Falha ao enviar link.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            
            if (error) throw error;
            
            toast.success('Senha atualizada com sucesso!');
            window.history.replaceState(null, '', window.location.pathname);
            setView('login');
            
            if (onRecoveryComplete) onRecoveryComplete();
        } catch (error: any) {
            console.error("Update password error:", error);
            const errorMessage = error.error_description || error.message || "Falha ao atualizar senha.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderLoginView = () => (
        <>
            <form className="space-y-6" onSubmit={handleLogin}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                        placeholder="seu@email.com"
                    />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                        placeholder="********"
                    />
                </div>
                <div className="text-right text-sm">
                    <button type="button" onClick={() => setView('forgot_password')} className="font-medium text-brand-accent hover:underline focus:outline-none">
                        Esqueceu sua senha?
                    </button>
                </div>
                {error && <p className="text-sm text-center text-brand-danger">{error}</p>}
                <div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>
            </form>
            <p className="text-center text-sm text-brand-text-secondary">
                Não tem uma conta?{' '}
                <button onClick={onSwitchView} className="font-medium text-brand-accent hover:underline focus:outline-none">
                    Cadastre-se
                </button>
            </p>
        </>
    );

    const renderForgotPasswordView = () => (
        <>
            <form className="space-y-6" onSubmit={handlePasswordReset}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        id="email-reset"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                        placeholder="seu@email.com"
                    />
                </div>
                {error && <p className="text-sm text-center text-brand-danger">{error}</p>}
                <div>
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>
                </div>
            </form>
            <p className="text-center text-sm text-brand-text-secondary">
                Lembrou a senha?{' '}
                <button onClick={() => setView('login')} className="font-medium text-brand-accent hover:underline focus:outline-none">
                    Voltar ao Login
                </button>
            </p>
        </>
    );

    const renderUpdatePasswordView = () => {
        if (isVerifying) {
            return <p className="text-center text-brand-text">Validando link de segurança...</p>;
        }

        if (!isSessionReady) {
            return (
                <div className="text-center space-y-4">
                    <p className="text-brand-danger">Link inválido ou expirado. Solicite um novo reset.</p>
                    <button onClick={() => setView('forgot_password')} className="text-brand-accent hover:underline">
                        Solicitar novo link
                    </button>
                    {!isSessionReady && !isVerifying && (
                        <pre className="mt-4 p-4 bg-gray-900 text-green-400 text-xs text-left rounded overflow-auto h-40 w-full max-w-md">
                            {debugLog}
                        </pre>
                    )}
                </div>
            );
        }

        return (
            <>
                <form className="space-y-6" onSubmit={handleUpdatePassword}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            id="new-password"
                            name="new-password"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                            placeholder="Nova Senha"
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                            placeholder="Confirmar Nova Senha"
                        />
                    </div>
                    {error && <p className="text-sm text-center text-brand-danger">{error}</p>}
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </div>
                </form>
                <p className="text-center text-sm text-brand-text-secondary">
                    <button onClick={() => {
                        setView('login');
                        if (onRecoveryComplete) onRecoveryComplete();
                    }} className="font-medium text-brand-accent hover:underline focus:outline-none">
                        Voltar ao Login
                    </button>
                </p>
            </>
        );
    };

    const getTitle = () => {
        switch (view) {
            case 'login': return 'ScaleMetrics';
            case 'forgot_password': return 'Recuperar Senha';
            case 'update_password': return 'Nova Senha';
        }
    };

    const getSubtitle = () => {
        switch (view) {
            case 'login': return 'Acesse seu dashboard de performance.';
            case 'forgot_password': return 'Insira seu e-mail para receber o link de recuperação.';
            case 'update_password': return 'Defina sua nova senha de acesso.';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-lg shadow-lg">
                <div className="flex flex-col items-center">
                    <FunnelIcon className="w-12 h-12 text-brand-accent" />
                    <h1 className="text-3xl font-bold text-brand-text mt-4">
                        {getTitle()}
                    </h1>
                    <p className="text-brand-text-secondary mt-1 text-center">
                        {getSubtitle()}
                    </p>
                </div>
                {view === 'login' && renderLoginView()}
                {view === 'forgot_password' && renderForgotPasswordView()}
                {view === 'update_password' && renderUpdatePasswordView()}
            </div>
        </div>
    );
};

export default Login;