import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Users,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Download
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Clock,
      title: 'Zeitersparnis',
      description: 'Automatische Erfassung aller Spieldaten aus DFBnet - keine manuelle Eingabe mehr nötig'
    },
    {
      icon: FileText,
      title: 'Sofortige Generierung',
      description: 'Professionelle Word-Dokumente auf Knopfdruck erstellt und ready zum Download'
    },
    {
      icon: Users,
      title: 'Multi-User System',
      description: 'Jeder Schiedsrichter hat seinen eigenen Account mit sicherer Datenverwaltung'
    },
    {
      icon: Shield,
      title: 'Datensicherheit',
      description: 'Verschlüsselte Speicherung deiner DFBnet-Zugangsdaten mit modernster Technologie'
    },
    {
      icon: Zap,
      title: 'Intelligentes Scraping',
      description: 'Automatisches Auslesen aller relevanten Spieldaten, Kontakte und Fahrtzeiten'
    },
    {
      icon: Download,
      title: 'Flexible Downloads',
      description: 'Einzelne Dokumente oder alle auf einmal als ZIP-Archiv herunterladen'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Account erstellen',
      description: 'Kostenlos registrieren und DFBnet-Zugangsdaten hinterlegen'
    },
    {
      number: '2',
      title: 'Session starten',
      description: 'System liest automatisch alle deine Spiele aus DFBnet aus'
    },
    {
      number: '3',
      title: 'Dokumente generieren',
      description: 'Professionelle Spesenberichte werden automatisch erstellt'
    },
    {
      number: '4',
      title: 'Download & fertig',
      description: 'Word-Dokumente herunterladen und direkt verwenden'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TFV Spesen Generator</h1>
              <p className="text-xs text-muted-foreground">Für Schiedsrichter in Thüringen</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex"
            >
              Anmelden
            </Button>
            <Button
              onClick={() => navigate('/register')}
            >
              Kostenlos starten
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4">
            Automatisierte Spesenabrechnung
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Spesenberichte in{' '}
            <span className="text-primary">
              Sekunden
            </span>
            {' '}statt Stunden
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Die professionelle Lösung für Thüringer Schiedsrichter.
            Automatische Generierung von Spesenberichten direkt aus deinen DFBnet-Daten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="text-lg px-8 w-full sm:w-auto"
            >
              Jetzt kostenlos starten
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-lg px-8 w-full sm:w-auto"
            >
              Bereits registriert? Anmelden
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>100% Kostenlos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Keine Installation nötig</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Sichere Datenverwaltung</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Alles was du brauchst
              </h2>
              <p className="text-lg text-muted-foreground">
                Von der Datenerfassung bis zum fertigen Dokument - vollautomatisch
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
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
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                So funktioniert's
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                In 4 einfachen Schritten
              </h2>
              <p className="text-lg text-muted-foreground">
                Von der Anmeldung bis zum fertigen Spesenbericht
              </p>
            </div>

            <div>
              {steps.map((step, index) => (
                <div key={index}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-primary-foreground">{step.number}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {step.title}
                          </h3>
                          <p className="text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-4">
                      <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-secondary py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                Technologie
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-4">
                Modern & Zuverlässig
              </h2>
              <p className="text-lg text-muted-foreground">
                Gebaut mit bewährten Technologien für maximale Stabilität
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Backend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>FastAPI (Python)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Playwright Web Scraping</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>JWT Authentication</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>python-docx Generator</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frontend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>React + TypeScript</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Tailwind CSS</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>shadcn/ui Components</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Responsive Design</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-accent">
              <CardContent className="p-8 sm:p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-accent-foreground mb-4">
                  Bereit für automatisierte Spesenberichte?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Schließe dich den Schiedsrichtern in Thüringen an, die bereits Zeit sparen
                  und ihre Spesenabrechnungen automatisch erstellen lassen.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="text-lg px-8"
                >
                  Kostenlos registrieren
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-secondary-foreground">TFV Spesen Generator</p>
                  <p className="text-sm text-muted-foreground">Für Schiedsrichter in Thüringen</p>
                </div>
              </div>
              <div className="text-sm text-center sm:text-right">
                <p className="text-secondary-foreground">Entwickelt mit ❤️ für die SR-Community</p>
                <p className="text-muted-foreground mt-1">© 2025 TFV Spesen Generator</p>
              </div>
            </div>
            <Separator className="my-8" />
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Diese Anwendung ist ein Community-Projekt und steht in keiner offiziellen
                Verbindung zum DFB oder TFV.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}