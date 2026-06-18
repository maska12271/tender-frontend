import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { FormField } from '../components/FormField.jsx'

export default function LoginPage() {
    const { t } = useTranslation()
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email.trim(), password)
            navigate('/dashboard', { replace: true })
        } catch (err) {
            setError(err.message || t('login.error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-teal-700 dark:text-teal-400">
                        TenderSys
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t('login.subtitle')}
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <FormField
                        id="login-email"
                        label={t('common.email')}
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@company.com"
                        autoComplete="username"
                    />

                    <FormField
                        id="login-password"
                        label={t('users.form.password')}
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-teal-600 px-4 py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                        {loading ? t('login.signingIn') : t('login.signIn')}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t('login.demo')}
                </p>
            </div>
        </div>
    )
}
