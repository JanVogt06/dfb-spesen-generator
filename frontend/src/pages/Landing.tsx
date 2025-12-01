import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {useNavigate, Link} from 'react-router-dom';
import {
    FileText,
    Clock,
    Users,
    Shield,
    Zap,
    CheckCircle2,
    ArrowRight,
    Download,
    Sparkles,
    Rocket,
    HelpCircle
} from 'lucide-react';

export function LandingPage() {
    const navigate = useNavigate();

    const features = [
        {
            icon: Clock,
            title: 'Zeitersparnis',
            description: 'Automatische Erfassung aller Spieldaten aus DFBnet - keine manuelle Eingabe mehr nötig',
            gradient: 'from-emerald-500 to-teal-500'
        },
        {
            icon: FileText,
            title: 'Sofortige Generierung',
            description: 'Professionelle Word-Dokumente auf Knopfdruck erstellt und ready zum Download',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Users,
            title: 'Multi-User System',
            description: 'Jeder Schiedsrichter hat seinen eigenen Account mit sicherer Datenverwaltung',
            gradient: 'from-violet-500 to-purple-500'
        },
        {
            icon: Shield,
            title: 'Datensicherheit',
            description: 'Verschlüsselte Speicherung deiner DFBnet-Zugangsdaten mit modernster Technologie',
            gradient: 'from-orange-500 to-red-500'
        },
        {
            icon: Zap,
            title: 'Intelligentes Scraping',
            description: 'Automatisches Auslesen aller relevanten Spieldaten, Spielorte und Schiedsrichter-Kontakte',
            gradient: 'from-yellow-500 to-amber-500'
        },
        {
            icon: Download,
            title: 'Flexible Downloads',
            description: 'Einzelne Dokumente oder alle auf einmal als ZIP-Archiv herunterladen',
            gradient: 'from-pink-500 to-rose-500'
        }
    ];

    const steps = [
        {
            number: '1',
            title: 'Account erstellen',
            description: 'Kostenlos registrieren und DFBnet-Zugangsdaten hinterlegen',
            color: 'emerald'
        },
        {
            number: '2',
            title: 'Session starten',
            description: 'System liest automatisch alle deine Spiele aus DFBnet aus',
            color: 'blue'
        },
        {
            number: '3',
            title: 'Dokumente generieren',
            description: 'Professionelle Spesenberichte werden automatisch erstellt',
            color: 'violet'
        },
        {
            number: '4',
            title: 'Download & fertig',
            description: 'Word-Dokumente herunterladen und direkt verwenden',
            color: 'orange'
        }
    ];

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Animated Background Pattern */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"
                     style={{animationDuration: '4s'}}></div>
                <div className="absolute top-40 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"
                     style={{animationDuration: '6s', animationDelay: '1s'}}></div>
                <div
                    className="absolute bottom-20 left-1/3 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl animate-pulse"
                    style={{animationDuration: '5s', animationDelay: '2s'}}></div>
            </div>

            {/* Header/Navigation */}
            <header
                className="relative border-b border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl blur-md opacity-70
                            group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center
                            justify-center transform group-hover:scale-110 transition-transform shadow-lg">
                                <FileText className="w-7 h-7 text-white"/>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">TFV
                                Spesen Generator</h1>
                            <p className="text-xs text-emerald-600 font-medium">Für Schiedsrichter in Thüringen</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/login')}
                            className="hidden sm:inline-flex hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-200 font-semibold"
                        >
                            Anmelden
                        </Button>
                        <Button
                            onClick={() => navigate('/register')}
                            className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700
                       text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40
                       transition-all duration-300"
                        >
                            Kostenlos starten
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative container mx-auto px-4 py-20 sm:py-16">
                <div className="max-w-5xl mx-auto text-center">
                    <Badge className="mb-6 bg-gradient-to-r from-emerald-500 to-blue-600 text-white border-0 px-4 py-1.5
                         text-sm font-semibold shadow-lg">
                        <Zap className="w-3.5 h-3.5 mr-1.5 inline"/>
                        Automatisierte Spesenabrechnung
                    </Badge>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-slate-100 mb-8 leading-tight">
                        Spesenberichte in{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Sekunden
            </span>
                        <br/>
                        statt Stunden
                    </h1>

                    <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
                        <span className="text-emerald-600">Automatische Generierung</span> von Spesenberichten direkt
                        aus deinen DFBnet-Daten.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                        <Button
                            size="lg"
                            onClick={() => navigate('/register')}
                            className="text-lg px-10 py-7 w-full sm:w-auto font-bold rounded-xl
                       bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700
                       text-white shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60
                       transform hover:scale-105 transition-all duration-300"
                        >
                            Jetzt kostenlos starten
                            <ArrowRight className="ml-2 w-6 h-6"/>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => navigate('/login')}
                            className="text-lg px-10 py-7 w-full sm:w-auto font-semibold rounded-xl
                       border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30
                       text-slate-700 dark:text-slate-200 hover:text-emerald-700
                       transform hover:scale-105 transition-all duration-300"
                        >
                            Bereits registriert? Anmelden
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500"/>
                            <span>100% Kostenlos</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                            <CheckCircle2 className="w-5 h-5 text-blue-500"/>
                            <span>Keine Installation nötig</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                            <CheckCircle2 className="w-5 h-5 text-violet-500"/>
                            <span>Sichere Datenverwaltung</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-20 sm:py-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline"
                                   className="mb-4 border-emerald-300 text-emerald-700 font-semibold px-4 py-1">
                                <Sparkles className="w-3.5 h-3.5 mr-1.5 inline"/>
                                Features
                            </Badge>
                            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 mb-4">
                                Alles was du brauchst
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
                                Von der Datenerfassung bis zum fertigen Dokument - vollautomatisch
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, index) => (
                                <Card
                                    key={index}
                                    className="group relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-transparent
                           bg-white dark:bg-slate-800 hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
                                >
                                    {/* Gradient Overlay on Hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 
                                 group-hover:opacity-10 transition-opacity duration-500`}></div>

                                    <CardHeader className="relative">
                                        <div className="relative mb-4">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl 
                                     opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
                                            <div className={`relative w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl 
                                     flex items-center justify-center shadow-lg transform group-hover:scale-110 
                                     transition-all duration-500`}>
                                                <feature.icon className="w-7 h-7 text-white"/>
                                            </div>
                                        </div>
                                        <CardTitle
                                            className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:text-slate-100">
                                            {feature.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="relative">
                                        <CardDescription
                                            className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {feature.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works Section */}
            <section className="relative py-20 sm:py-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline"
                                   className="mb-4 border-blue-300 text-blue-700 font-semibold px-4 py-1">
                                <Rocket className="w-3.5 h-3.5 mr-1.5 inline"/>
                                So funktioniert's
                            </Badge>
                            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 mb-4">
                                In 4 einfachen Schritten
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
                                Von der Anmeldung bis zum fertigen Spesenbericht
                            </p>
                        </div>

                        <div className="space-y-6">
                            {steps.map((step, index) => {
                                const colorClasses = {
                                    emerald: {
                                        bg: 'from-emerald-500 to-teal-500',
                                        text: 'text-emerald-600',
                                        border: 'border-emerald-200',
                                        glow: 'shadow-emerald-500/30'
                                    },
                                    blue: {
                                        bg: 'from-blue-500 to-cyan-500',
                                        text: 'text-blue-600',
                                        border: 'border-blue-200',
                                        glow: 'shadow-blue-500/30'
                                    },
                                    violet: {
                                        bg: 'from-violet-500 to-purple-500',
                                        text: 'text-violet-600',
                                        border: 'border-violet-200',
                                        glow: 'shadow-violet-500/30'
                                    },
                                    orange: {
                                        bg: 'from-orange-500 to-red-500',
                                        text: 'text-orange-600',
                                        border: 'border-orange-200',
                                        glow: 'shadow-orange-500/30'
                                    }
                                };
                                const colors = colorClasses[step.color as keyof typeof colorClasses];

                                return (
                                    <div key={index}>
                                        <Card className={`group relative overflow-hidden border-2 ${colors.border} hover:border-transparent
                                   bg-white dark:bg-slate-800 hover:shadow-2xl ${colors.glow} transition-all duration-500 
                                   transform hover:scale-102`}>
                                            {/* Gradient Overlay on Hover */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 
                                     group-hover:opacity-10 transition-opacity duration-500`}></div>

                                            <CardContent className="p-8 relative">
                                                <div className="flex items-start gap-6">
                                                    <div className="relative flex-shrink-0">
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl blur-xl 
                                           opacity-40 group-hover:opacity-70 transition-opacity duration-500`}></div>
                                                        <div
                                                            className={`relative w-16 h-16 bg-gradient-to-br ${colors.bg} rounded-2xl 
                                           flex items-center justify-center shadow-xl transform group-hover:scale-110 
                                           transition-all duration-500`}>
                                                            <span
                                                                className="text-2xl font-black text-white">{step.number}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className={`text-2xl font-bold mb-2 ${colors.text}`}>
                                                            {step.title}
                                                        </h3>
                                                        <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                                                            {step.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="relative py-20 sm:py-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline"
                                   className="mb-4 border-violet-300 text-violet-700 font-semibold px-4 py-1">
                                <HelpCircle className="w-3.5 h-3.5 mr-1.5 inline"/>
                                Häufige Fragen
                            </Badge>
                            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 mb-4">
                                Fragen & Antworten
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
                                Alles was du wissen musst
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Card
                                className="group hover:shadow-lg transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200">
                                <CardHeader>
                                    <CardTitle
                                        className="text-xl text-slate-800 dark:text-slate-100 flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <CheckCircle2 className="w-4 h-4 text-white"/>
                                        </div>
                                        Ist der Service wirklich kostenlos?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-9">
                                        Ja, der TFV Spesen Generator ist zu 100% kostenlos für alle Schiedsrichter in
                                        Thüringen.
                                        Es gibt keine versteckten Kosten oder Premium-Features.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                className="group hover:shadow-lg transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200">
                                <CardHeader>
                                    <CardTitle
                                        className="text-xl text-slate-800 dark:text-slate-100 flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Shield className="w-4 h-4 text-white"/>
                                        </div>
                                        Wie sicher sind meine DFBnet-Zugangsdaten?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-9">
                                        Deine Zugangsdaten werden mit Fernet-Verschlüsselung (symmetrische
                                        Verschlüsselung) sicher gespeichert
                                        und sind nur für dich zugänglich. Dein Account-Passwort wird zusätzlich mit
                                        PBKDF2-HMAC gehashed.
                                        Die Daten werden ausschließlich für die Generierung deiner Spesenberichte
                                        verwendet.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                className="group hover:shadow-lg transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200">
                                <CardHeader>
                                    <CardTitle
                                        className="text-xl text-slate-800 dark:text-slate-100 flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <FileText className="w-4 h-4 text-white"/>
                                        </div>
                                        Welche Daten werden aus DFBnet ausgelesen?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-9">
                                        Das System liest automatisch alle relevanten Spielinformationen aus: Datum und
                                        Uhrzeit, Teams, Spielklasse,
                                        Spielort mit Adresse und Platztyp, sowie alle Schiedsrichter-Kontaktdaten (Name,
                                        Telefon, E-Mail, Adresse).
                                        Diese Daten werden strukturiert in Word-Dokumente übertragen.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                className="group hover:shadow-lg transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200">
                                <CardHeader>
                                    <CardTitle
                                        className="text-xl text-slate-800 dark:text-slate-100 flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Clock className="w-4 h-4 text-white"/>
                                        </div>
                                        Wie lange dauert die Generierung?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-9">
                                        Eine manuelle Session dauert je nach Anzahl der Spiele 1-6 Minuten.
                                        Allerdings läuft jeden Abend um 3 Uhr automatisch ein Scraping-Job für alle
                                        Nutzer,
                                        sodass deine Daten immer auf dem neuesten Stand sind und du in der Regel nicht
                                        warten musst.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                className="group hover:shadow-lg transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200">
                                <CardHeader>
                                    <CardTitle
                                        className="text-xl text-slate-800 dark:text-slate-100 flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Download className="w-4 h-4 text-white"/>
                                        </div>
                                        Kann ich die Dokumente nachträglich bearbeiten?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-9">
                                        Ja! Die generierten Word-Dokumente kannst du nach dem Download beliebig mit
                                        Microsoft Word oder anderen
                                        kompatiblen Programmen bearbeiten und an deine Bedürfnisse anpassen.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer
                className="relative py-12 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        {/* Logo & Beschreibung */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <FileText className="w-6 h-6 text-white"/>
                                </div>
                                <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
            TFV Spesen Generator
          </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                                Automatisierte Spesenabrechnung für Schiedsrichter des Thüringer Fußball-Verbandes
                            </p>
                        </div>

                        {/* Trennlinie */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <div
                                className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <p>© 2025 TFV Spesen Generator</p>

                                <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                                    <span>Betreiber: Jan Vogt</span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <a
                                        href="mailto:spesen-generator@jan-vogt.dev"
                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        spesen-generator@jan-vogt.dev
                                    </a>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <Link
                                        to="/datenschutz"
                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        Datenschutz
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}