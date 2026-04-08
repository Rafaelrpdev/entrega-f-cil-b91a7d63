import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  ArrowRight
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, user, loading } = useAuth();

  const navigate = useNavigate();


  // ✅ Redireciona se já estiver logado
  useEffect(() => {

    if (user && !loading) {

      navigate("/", { replace: true });

    }

  }, [user, loading, navigate]);



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!email || !password) {

      toast.error("Por favor, preencha todos os campos.");
      return;

    }

    setIsLoading(true);

    try {

      if (isLogin) {

        const { error } =
          await signIn(email, password);

        if (error) {

          toast.error(
            "Erro ao fazer login. Verifique suas credenciais."
          );

        } else {

          toast.success(
            "Bem-vindo de volta!"
          );

          // ✅ Corrigido: agora vai para "/"
          navigate("/", { replace: true });

        }

      } else {

        const { error } =
          await signUp(email, password);

        if (error) {

          toast.error(
            error.message ||
            "Erro ao criar conta."
          );

        } else {

          toast.success(
            "Conta criada com sucesso! Faça login para continuar."
          );

          setIsLogin(true);

        }

      }

    } catch (err) {

      console.error(err);

      toast.error(
        "Ocorreu um erro inesperado."
      );

    } finally {

      setIsLoading(false);

    }

  };



  // ✅ Loading enquanto verifica sessão
  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-zinc-950">

        <Loader2 className="w-8 h-8 animate-spin text-primary" />

      </div>

    );

  }



  return (

    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#09090b]">

      {/* Background animado */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">

        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />

        <div className="absolute top-[60%] -right-[10%] w-[30%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]" />

      </div>



      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 z-10 relative"
      >

        <div className="bg-zinc-950/50 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

          {/* brilho superior */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />



          {/* Cabeçalho */}
          <div className="text-center mb-8">

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-tr from-primary to-primary/40 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20"
            >

              <LogIn className="w-8 h-8 text-white" />

            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">

              {isLogin
                ? "Bem-vindo de volta"
                : "Criar nova conta"}

            </h1>

            <p className="text-zinc-400 text-sm">

              {isLogin
                ? "Faça login para acessar o sistema"
                : "Preencha os dados para se cadastrar"}

            </p>

          </div>



          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Email */}
            <div className="relative">

              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="pl-10 bg-zinc-900/50 border-white/10 text-white h-12 rounded-xl"
                required
              />

            </div>



            {/* Senha */}
            <div className="relative">

              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

              <Input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="pl-10 bg-zinc-900/50 border-white/10 text-white h-12 rounded-xl"
                required
              />

            </div>



            {/* Botão */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium group relative overflow-hidden"
            >

              <span className="relative z-10 flex items-center justify-center gap-2">

                {isLoading ? (

                  <Loader2 className="w-5 h-5 animate-spin" />

                ) : (

                  <>
                    {isLogin ? "Entrar" : "Cadastrar"}

                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>

                )}

              </span>

            </Button>

          </form>



          {/* Alternar login/cadastro */}
          <div className="mt-6 text-center">

            <button
              onClick={() =>
                setIsLogin(!isLogin)
              }
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
            >

              {isLogin ? (

                <>
                  <span>Não tem uma conta?</span>
                  <span className="text-primary font-medium flex items-center">
                    Criar <UserPlus className="w-3 h-3 ml-1" />
                  </span>
                </>

              ) : (

                <>
                  <span>Já possui uma conta?</span>
                  <span className="text-primary font-medium flex items-center">
                    Fazer login <LogIn className="w-3 h-3 ml-1" />
                  </span>
                </>

              )}

            </button>

          </div>

        </div>



        {/* Visitante */}
        <div className="mt-8 text-center">

          <button
            onClick={() =>
              navigate("/")
            }
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >

            Continuar como visitante

          </button>

        </div>

      </motion.div>

    </div>

  );

};

export default Login;
