import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;

  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;

  signOut: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);


export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    let mounted = true;

    // 🔐 Listener de mudança de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );


    // 🔍 Buscar sessão atual ao iniciar
    const getInitialSession = async () => {

      try {

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro ao obter sessão:", error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }

      } catch (err) {

        console.error("Erro inesperado:", err);

      } finally {

        // ⚠️ Garante que loading nunca fique travado
        if (mounted) {
          setLoading(false);
        }

      }

    };


    getInitialSession();


    return () => {

      mounted = false;
      subscription.unsubscribe();

    };

  }, []);



  // 🔐 Criar conta
  const signUp = async (
    email: string,
    password: string
  ) => {

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    return {
      error: error as Error | null,
    };

  };



  // 🔐 Login
  const signIn = async (
    email: string,
    password: string
  ) => {

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    return {
      error: error as Error | null,
    };

  };



  // 🔓 Logout
  const signOut = async () => {

    try {

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error("Erro ao sair:", error);
      }

    } catch (err) {

      console.error("Erro inesperado no logout:", err);

    }

  };



  return (

    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}



// Hook personalizado
export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) {

    throw new Error(
      "useAuth must be used within AuthProvider"
    );

  }

  return ctx;

}
