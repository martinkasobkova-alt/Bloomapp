import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useContactEmail } from '../hooks/useContactEmail';
import { useTextSettings } from '../hooks/useTextSettings';
import { SectionHeader } from '../components/SectionHeader';
import {
  Heart, ShieldCheck, Users, Lock, MessageCircle, HandHeart,
  ChevronRight, Scale, Phone
} from 'lucide-react';

const principles = [
  {
    icon: Heart,
    color: '#F5A9B8',
    title: 'Respektujeme se navzájem',
    text: 'Oslovujeme každého jeho preferovanými jmény a zájmeny. Respektujeme různé cesty a zkušenosti – nejsou žádné správné nebo špatné způsoby, jak být trans.',
  },
  {
    icon: ShieldCheck,
    color: '#5BCEFA',
    title: 'Netolerujeme obtěžování',
    text: 'Jakékoli obtěžování, šikana nebo nepřátelské komentáře nemají v Bloom místo. Pokud se cítíte nepříjemně, kontaktujte administrátora.',
  },
  {
    icon: MessageCircle,
    color: '#8A7CFF',
    title: 'Žádný spam ani reklama',
    text: 'Bloom není obchodní platforma. Nevkládejte nevyžádanou reklamu ani komerční obsah. Nabídky a poptávky patří do sekce Vzájemná podpora.',
  },
  {
    icon: Lock,
    color: '#A8E6CF',
    title: 'Chráníme soukromí ostatních',
    text: 'Co se sdílí v Bloom, zůstává v Bloom. Nesdílejte informace o jiných členech komunity bez jejich souhlasu. Respektujeme anonymitu.',
  },
  {
    icon: HandHeart,
    color: '#F7C59F',
    title: 'Pomáháme si',
    text: 'Bloom je o vzájemné podpoře. Sdílíme zkušenosti, pomáháme jeden druhému a vytváříme bezpečný prostor pro všechny, kteří hledají spojení nebo informace.',
  },
  {
    icon: Users,
    color: '#C3AED6',
    title: 'Prostor pro všechny etapy',
    text: 'Nejste sami, ať jste na jakékoli etapě své cesty. Přijímáme lidi přemýšlející o tranzici, uprostřed ní i po ní – a každou cestu přijímáme takovou, jaká je.',
  },
];

export default function CommunityPage() {
  const contactEmail = useContactEmail();
  const texts = useTextSettings();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3" id="guidelines">
        <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#FFFFFF] rounded mx-auto w-24 mb-4" />
        <SectionHeader sectionKey="community" defaultTitle="Zásady komunity" defaultSubtitle="Bezpečný prostor pro všechny" defaultColor="#8A7CFF" />
      </div>

      {/* Principles */}
      <div className="grid gap-4 sm:grid-cols-2">
        {principles.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="bg-white border-border/50 hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${p.color}20` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-bloom-text text-sm mb-1">{p.title}</p>
                    <p className="text-xs text-bloom-sub leading-relaxed">{p.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reporting */}
      <Card className="bg-bloom-violet/5 border-bloom-violet/20">
        <CardContent className="p-6 space-y-2">
          <p className="font-semibold text-bloom-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-bloom-violet" />Jak nahlásit problém?
          </p>
          <p className="text-sm text-bloom-sub leading-relaxed">
            Pokud narazíte na nevhodné chování, máte dvě možnosti: použijte tlačítko „Nahlásit uživatele" na profilu dané osoby, nebo napište přímo administrátorce na{' '}
            {contactEmail && <a href={`mailto:${contactEmail}`} className="text-bloom-violet hover:underline">{contactEmail}</a>}.
            Vaše nahlášení je důvěrné.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-white border-border/50" id="about">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text">O projektu Bloom</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-bloom-sub leading-relaxed space-y-2">
          <p>{texts.about_text || 'Bloom vznikl jako bezpečný komunitní prostor pro trans lidi v České republice – místo, kde lze sdílet zkušenosti, najít podporu, propojit se s odborníky a navazovat kontakty. Projekt provozuje komunita dobrovolně. Cílem je diskrétnost, soukromí a vzájemná pomoc.'}</p>
          <p>Kontakt: {contactEmail && <a href={`mailto:${contactEmail}`} className="text-bloom-violet hover:underline">{contactEmail}</a>}</p>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-white border-border/50" id="privacy">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Lock className="w-4 h-4 text-bloom-violet" />Ochrana soukromí
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-bloom-sub leading-relaxed space-y-2">
          <p>Bloom shromažďuje pouze data nezbytná pro fungování platformy: e-mail, přezdívku a profil, který sami vytvoříte.</p>
          <p>Vaše data nejsou sdílena s třetími stranami. Platforma nepoužívá sledovací technologie ani reklamní sítě.</p>
          <p>Máte právo požádat o smazání svého účtu a všech s ním spojených dat. Kontaktujte administrátora.</p>
        </CardContent>
      </Card>

      {/* Contact section */}
      <Card className="bg-white border-border/50" id="contact">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Phone className="w-4 h-4 text-bloom-violet" />Kontakt
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-bloom-sub leading-relaxed space-y-2">
          <p>{texts.contact_text || 'Máte dotazy nebo potřebujete pomoc? Neváhejte nás kontaktovat. Snažíme se odpovídat co nejrychleji.'}</p>
          {contactEmail && (
            <p><a href={`mailto:${contactEmail}`} className="text-bloom-violet hover:underline font-medium text-base">{contactEmail}</a></p>
          )}
        </CardContent>
      </Card>

      {/* Footer nav */}
      <div className="border-t border-border pt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-bloom-sub">
        <Link to="/" className="hover:text-bloom-violet transition-colors">Zpět na Bloom</Link>
        <a href={contactEmail ? `mailto:${contactEmail}` : '#'} className="hover:text-bloom-violet transition-colors flex items-center gap-1">
          <Phone className="w-3 h-3" />Kontakt
        </a>
      </div>
    </div>
  );
}
