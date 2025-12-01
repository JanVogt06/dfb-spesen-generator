import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {useNavigate} from 'react-router-dom';
import {FileText, ArrowLeft, Shield, Server, Mail} from 'lucide-react';

export function Datenschutz() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Header */}
            <header className="border-b border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <FileText className="w-6 h-6 text-white"/>
                        </div>
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">TFV Spesen Generator</span>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        Zurück
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-8">
                        Datenschutzerklärung
                    </h1>

                    <div className="space-y-6">
                        {/* Verantwortlicher */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-5 h-5 text-white"/>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Verantwortlicher</h2>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            Jan Vogt<br/>
                                            E-Mail: <a href="mailto:spesen-generator@jan-vogt.dev" className="text-emerald-600 hover:underline">spesen-generator@jan-vogt.dev</a>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Erhobene Daten */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Server className="w-5 h-5 text-white"/>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Erhobene Daten</h2>
                                        <p className="text-slate-600 dark:text-slate-300 mb-3">
                                            Wir speichern folgende Daten zur Bereitstellung des Dienstes:
                                        </p>
                                        <ul className="text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                                            <li>Benutzername und Passwort (gehashed mit PBKDF2)</li>
                                            <li>DFBnet-Zugangsdaten (verschlüsselt mit Fernet)</li>
                                            <li>Aus DFBnet abgerufene Spieldaten</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Datensicherheit */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-white"/>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Datensicherheit</h2>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            Alle sensiblen Daten werden verschlüsselt gespeichert. Die Übertragung erfolgt ausschließlich über HTTPS.
                                            Deine Daten werden nicht an Dritte weitergegeben und ausschließlich zur Generierung deiner Spesenberichte verwendet.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rechte */}
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Deine Rechte</h2>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner Daten.
                                    Kontaktiere uns dazu einfach per E-Mail. Bei Löschung deines Accounts werden alle zugehörigen Daten entfernt.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-8 text-center">
                        Stand: Januar 2025
                    </p>
                </div>
            </main>
        </div>
    );
}