import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FunnelIcon } from './icons';
import { toast } from 'react-hot-toast';
import { User, Phone, Mail, Lock } from 'lucide-react';

const InputField: React.FC<any> = ({ id, label, type, value, onChange, placeholder, icon: Icon, required = true }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-brand-text-secondary">{label}</label>
        <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="w-5 h-5 text-gray-400" />
            </div>
            <input
                id={id}
                name={id}
                type={type}
                required={required}
                value={value}
                onChange={onChange}
                className="w-full pl-10 pr-3 py-2 text-brand-text bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                placeholder={placeholder}
            />
        </div>
    </div>
);

interface SignUpProps {
    onSwitchView: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSwitchView }) => {
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isConfirmationSent, setIsConfirmationSent] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        whatsapp: whatsapp,
                    }
                }
            });
            if (error) throw error;
            setIsConfirmationSent(true);
        } catch (error: any) {
            setError(error.error_description || error.message || "Ocorreu um erro ao criar a conta.");
            toast.error(error.error_description || error.message || "Ocorreu um erro ao criar a conta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-lg shadow-lg">
                <div className="flex flex-col items-center">
                    <FunnelIcon className="w-12 h-12 text-brand-accent" />
                    <h1 className="text-3xl font-bold text-brand-text mt-4">
                        {isConfirmationSent ? 'Confirme seu E-mail' : 'Criar Conta'}
                    </h1>
                     <p className="text-brand-text-secondary mt-1 text-center">
                        {isConfirmationSent 
                            ? `Quase lá! Enviamos um link de confirmação para ${email}.`
                            : 'Comece a analisar sua performance.'}
                    </p>
                </div>
                
                {isConfirmationSent ? (
                    <div className="text-center space-y-6 animate-fade-in">
                        <p className="text-brand-success font-semibold">
                            Clique no link enviado para ativar sua conta.
                        </p>
                        <button
                            onClick={onSwitchView}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
                        >
                           Voltar ao Login
                        </button>
                    </div>
                ) : (
                    <>
                        <form className="space-y-4" onSubmit={handleSignUp}>
                            <InputField id="full-name" label="Nome Completo" type="text" value={fullName} onChange={(e: any) => setFullName(e.target.value)} placeholder="Seu nome completo" icon={User} />
                            <InputField id="whatsapp" label="WhatsApp" type="tel" value={whatsapp} onChange={(e: any) => setWhatsapp(e.target.value)} placeholder="(DDD) 99999-9999" icon={Phone} />
                            <InputField id="email-signup" label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="seu@email.com" icon={Mail} />
                            <InputField id="password-signup" label="Senha" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="********" icon={Lock} />
                            <InputField id="confirm-password-signup" label="Confirmar Senha" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} placeholder="********" icon={Lock} />
                            
                            {error && <p className="text-sm text-center text-brand-danger">{error}</p>}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Criando conta...' : 'Criar Minha Conta'}
                                </button>
                            </div>
                        </form>
                         <p className="text-center text-sm text-brand-text-secondary">
                            Já tem uma conta?{' '}
                            <button onClick={onSwitchView} className="font-medium text-brand-accent hover:underline focus:outline-none">
                                Faça Login
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default SignUp;