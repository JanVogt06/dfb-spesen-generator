import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft, Shield, Server, Mail, Receipt} from 'lucide-react';

export function Datenschutz() {
    const navigate = useNavigate();

    const sections = [
        {
            icon: Mail,
            title: 'Verantwortlicher',
            content: (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Jan Vogt<br/>
                    E-Mail: <a href="mailto:spesen-generator@jan-vogt.dev" className="text-foreground underline underline-offset-4 hover:no-underline">spesen-generator@jan-vogt.dev</a>
                </p>
            ),
        },
        {
            icon: Server,
            title: 'Erhobene Daten',
            content: (
                <>
                    <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                        Wir speichern folgende Daten zur Bereitstellung des Dienstes:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>Benutzername und Passwort (gehashed mit PBKDF2)</li>
                        <li>DFBnet-Zugangsdaten (verschlüsselt mit Fernet)</li>
                        <li>Aus DFBnet abgerufene Spieldaten</li>
                    </ul>
                </>
            ),
        },
        {
            icon: Shield,
            title: 'Datensicherheit',
            content: (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Alle sensiblen Daten werden verschlüsselt gespeichert. Die Übertragung erfolgt ausschließlich über HTTPS.
                    Deine Daten werden nicht an Dritte weitergegeben und ausschließlich zur Generierung deiner Spesenberichte verwendet.
                </p>
            ),
        },
        {
            icon: null,
            title: 'Deine Rechte',
            content: (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner Daten.
                    Kontaktiere uns dazu einfach per E-Mail. Bei Löschung deines Accounts werden alle zugehörigen Daten entfernt.
                </p>
            ),
        },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-card">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <button className="flex items-center gap-2.5" onClick={() => navigate('/')}>
                        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                            <Receipt className="size-4"/>
                        </span>
                        <span className="text-sm font-semibold tracking-tight">TFV Spesen</span>
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="text-muted-foreground"
                    >
                        <ArrowLeft className="size-4"/>
                        Zurück
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
                <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Datenschutzerklärung
                </h1>

                <div className="space-y-3">
                    {sections.map((section, index) => (
                        <Card key={index} className="py-5">
                            <CardContent className="px-5">
                                <div className="flex items-start gap-3">
                                    {section.icon && (
                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                                            <section.icon className="size-4 text-foreground"/>
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="mb-1.5 font-medium">{section.title}</h2>
                                        {section.content}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Stand: Januar 2025
                </p>
            </main>
        </div>
    );
}
