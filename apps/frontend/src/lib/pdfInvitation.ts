import { format } from 'date-fns';
import { formatPhoneNumber } from '@areena/shared';

export interface TournamentInvitationData {
    competition: any;
    roles?: any[];
    players?: any[];
    categories?: any[];
}

export function generateTournamentInvitationPdf(data: TournamentInvitationData) {
    const { competition, roles = [], players = [], categories = [] } = data;

    if (!competition) return;

    // 1. Identify Officials
    const headRefereeRole = roles.find((r: any) => ['HEAD_REFEREE', 'REFEREE'].includes(r.role));
    const headReferee = headRefereeRole?.user
        ? `${headRefereeRole.user.firstName || ''} ${headRefereeRole.user.lastName || ''}`.trim()
        : 'Félicien Gache';
    const headRefereeEmail = headRefereeRole?.user?.email || 'felicien.gache@ik.me';

    const organizerRole = roles.find((r: any) => ['ADMIN'].includes(r.role));
    const organizerName = organizerRole?.user
        ? `${organizerRole.user.firstName || ''} ${organizerRole.user.lastName || ''}`.trim()
        : 'Turnierleitung';
    const organizerEmail = organizerRole?.user?.email || 'kontakt@areena.ch';
    const organizerPhone = organizerRole?.user?.phone
        ? formatPhoneNumber(organizerRole.user.phone)
        : '+41 79 753 36 41';

    // 2. Dates & Location
    const startDate = competition.startDate ? new Date(competition.startDate) : new Date();
    const endDate = competition.endDate ? new Date(competition.endDate) : startDate;
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const dateFormatted = sameDay
        ? format(startDate, 'EEEE, dd. MMMM yyyy')
        : `${format(startDate, 'EEEE, dd. MMMM')} und ${format(endDate, 'EEEE, dd. MMMM yyyy')}`;

    const hallLocation = competition.location || 'Salle Omnisport, Rue du Mont Noble 37, 3960 Sierre';
    const tournamentName = competition.name || 'GREGOR KUONEN CUP XXL';
    const entryFee = competition.entryFee || 39;
    const assocName = competition.association?.name || 'Swiss Table Tennis Federation';
    const assocCode = competition.association?.code || 'STTV';

    // 3. Category Scheduling (Split into days or schedule times)
    const cats = competition.categories && competition.categories.length > 0 ? competition.categories : categories;

    // Build categories schedule blocks
    const half = Math.ceil((cats.length || 1) / 2);
    const day1Cats = cats.length > 0 ? cats.slice(0, half) : [
        { name: 'B14 + 1Pkte-Sieg Serie', time: '08:00 - 11:30' },
        { name: 'A17 + 1Pkte-Sieg Serie', time: '11:30 - 15:00' },
        { name: 'A22 + 1Pkte-Sieg Serie', time: '15:00 - 19:00' },
    ];
    const day2Cats = cats.length > 1 ? cats.slice(half) : [
        { name: 'D3 + 1Pkte-Sieg Serie', time: '08:00 - 11:30' },
        { name: 'C7 + 1Pkte-Sieg Serie', time: '11:30 - 15:00' },
        { name: 'B11 + 1Pkte-Sieg Serie', time: '15:00 - 19:00' },
    ];

    const timeSlots = ['08:00 - 11:30', '11:30 - 15:00', '15:00 - 19:00', '19:00 - 22:00'];

    // 4. HTML document for printing
    const printHtml = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <title>Ausschreibung - ${tournamentName}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 14mm 14mm 14mm 14mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.45;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        .header-logo-left {
            font-size: 16px;
            font-weight: 900;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header-logo-left span {
            color: #dc2626;
        }
        .header-center {
            text-align: center;
        }
        .edition-tag {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 2px;
        }
        .title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #000;
            margin: 0;
        }
        .header-logo-right {
            background: #000;
            color: #fbbf24;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 900;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        
        .table-info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .table-info tr {
            border-bottom: 1px solid #f3f4f6;
        }
        .table-info td {
            padding: 5px 4px;
            vertical-align: top;
        }
        .label-col {
            width: 140px;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            color: #1f2937;
            letter-spacing: 0.3px;
        }
        .val-col {
            color: #374151;
            font-size: 10.5px;
        }
        .val-col ul {
            margin: 0;
            padding-left: 14px;
        }
        .val-col li {
            margin-bottom: 3px;
        }
        .highlight-red {
            color: #dc2626;
            font-weight: 700;
        }
        .highlight-link {
            color: #2563eb;
            text-decoration: underline;
        }
        
        /* Schedule Matrix Table */
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0 8px 0;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .schedule-table th {
            background: #e2e8f0;
            padding: 5px 8px;
            font-size: 10px;
            font-weight: 800;
            text-align: left;
            text-transform: uppercase;
            border: 1px solid #cbd5e1;
            color: #1e293b;
        }
        .schedule-table td {
            padding: 6px 8px;
            vertical-align: top;
            border: 1px solid #cbd5e1;
            font-size: 10.5px;
            width: 50%;
        }
        .schedule-day-opening {
            font-weight: 700;
            margin-bottom: 4px;
            color: #0f172a;
        }
        .schedule-entry {
            margin-bottom: 3px;
            color: #1e293b;
        }
        
        .banner-highlight {
            text-align: center;
            font-weight: bold;
            color: #dc2626;
            margin: 6px 0;
            font-size: 11px;
            text-decoration: underline;
        }
        
        .footer-note {
            text-align: center;
            margin-top: 14px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 10.5px;
            font-weight: 600;
            color: #1f2937;
        }
        .footer-sign {
            text-align: right;
            margin-top: 8px;
            font-weight: 700;
            font-size: 10.5px;
            color: #111827;
        }
        
        .sub-bullet {
            padding-left: 12px;
            font-size: 9.5px;
            color: #4b5563;
        }
    </style>
</head>
<body>

    <!-- Header Section -->
    <div class="header">
        <div class="header-logo-left">
            <span>●</span> ${assocCode}
        </div>
        <div class="header-center">
            <div class="edition-tag">– Offizielle Turnierausschreibung –</div>
            <h1 class="title">${tournamentName}</h1>
        </div>
        <div class="header-logo-right">
            AREENA
        </div>
    </div>

    <!-- Details Table -->
    <table class="table-info">
        <tr>
            <td class="label-col">DATUM</td>
            <td class="val-col"><strong>${dateFormatted}</strong></td>
        </tr>
        <tr>
            <td class="label-col">ORT</td>
            <td class="val-col">${hallLocation}</td>
        </tr>
        <tr>
            <td class="label-col">ANMELDUNG</td>
            <td class="val-col">
                <ul style="list-style-type: square;">
                    <li>Die Einschreibungen und Setzlisten sind auf der Plattform ersichtlich: <strong>AREENA / ${assocName}</strong></li>
                    <li>Die Turnierorganisation kann in begründeten Fällen und unter Berücksichtigung bisheriger Erfahrungen über die Zulassung von Spielern entscheiden.</li>
                    <li><span class="highlight-red">Die Zahlung bestätigt die Anmeldung! Online-Zahlung direkt über AREENA.</span></li>
                </ul>
            </td>
        </tr>
        <tr>
            <td class="label-col">ABMELDUNGEN</td>
            <td class="val-col">
                Telefonisch oder per E-Mail bis spätestens 48 Stunden vor Turnierbeginn an die Organisation. 
                Nur Spieler, welche sich fristgemäss abmelden, erhalten die Anmeldegebühr zurückerstattet.
            </td>
        </tr>
        <tr>
            <td class="label-col">SPIELMODUS</td>
            <td class="val-col">
                <ul style="list-style-type: square;">
                    <li>Max. 32 Einschreibungen pro Serie. Es wird in Gruppen von 3–4 Spielern gespielt.</li>
                    <li>Nach der Gruppenphase sind alle Spieler für K.o.-Tabellen qualifiziert:
                        <div class="sub-bullet">- Die ersten beiden jeder Gruppe bestreiten das Haupttableau.</div>
                        <div class="sub-bullet">- Die Dritt- und Viertplatzierten jeder Gruppe bestreiten die Trostrunde (3–4).</div>
                    </li>
                    <li>Offizielle ELO-Wertung für lizenzierte Kategorien gemäss STTV/ITTF-Reglement.</li>
                    <li>Jeder Spieler darf in so vielen Serien starten, wie der Zeitplan erlaubt.</li>
                </ul>
            </td>
        </tr>
        <tr>
            <td class="label-col">OBERSCHIEDSRICHTER</td>
            <td class="val-col">${headReferee}, E-Mail: <span class="highlight-link">${headRefereeEmail}</span></td>
        </tr>
        <tr>
            <td class="label-col">INFORMATION</td>
            <td class="val-col">${organizerName}: Tel: <strong>${organizerPhone}</strong>, E-Mail: <span class="highlight-link">${organizerEmail}</span></td>
        </tr>
        <tr>
            <td class="label-col">AUSLOSUNG</td>
            <td class="val-col">Vortag des Turniers ab 18:00 Uhr live in AREENA ersichtlich.</td>
        </tr>
        <tr>
            <td class="label-col">SERIEN & ZEITPLAN</td>
            <td class="val-col">
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>${format(startDate, 'EEEE, dd. MMMM yyyy')}</th>
                            <th>${format(endDate, 'EEEE, dd. MMMM yyyy')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div class="schedule-day-opening">07:30 Uhr Hallenöffnung & Einschreibekontrolle</div>
                                ${day1Cats.map((c: any, i: number) => `
                                    <div class="schedule-entry">
                                        <strong>${c.time || timeSlots[i % timeSlots.length]}:</strong> ${c.name}
                                    </div>
                                `).join('')}
                            </td>
                            <td>
                                <div class="schedule-day-opening">07:30 Uhr Hallenöffnung & Einschreibekontrolle</div>
                                ${day2Cats.map((c: any, i: number) => `
                                    <div class="schedule-entry">
                                        <strong>${c.time || timeSlots[i % timeSlots.length]}:</strong> ${c.name}
                                    </div>
                                `).join('')}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
        <tr>
            <td class="label-col">EINSÄTZE</td>
            <td class="val-col">
                <table style="width: 250px; font-size: 10.5px;">
                    <tr>
                        <td>1 Serie</td>
                        <td style="text-align: right;"><strong>CHF ${entryFee}.-</strong></td>
                    </tr>
                    <tr>
                        <td>Jede weitere Serie</td>
                        <td style="text-align: right;"><strong>CHF ${(entryFee * 0.75).toFixed(0)}.-</strong></td>
                    </tr>
                    <tr>
                        <td>Turnierlizenz / Verbandsabgabe</td>
                        <td style="text-align: right;"><strong>CHF 4.-</strong></td>
                    </tr>
                </table>
                <div class="banner-highlight">
                    Bezahlung: Online via AREENA (TWINT / Kreditkarte / Bank). Die Bezahlung bestätigt die Anmeldung.
                </div>
            </td>
        </tr>
        <tr>
            <td class="label-col">PREISE</td>
            <td class="val-col">
                <ul style="list-style-type: square;">
                    <li><strong>Elite & Hauptserien:</strong> 1. Rang: CHF 500.-, 2. Rang: CHF 250.-, 3. Rang je: CHF 100.-</li>
                    <li><strong>Kategorieserien:</strong> Sachpreise, Medaillen, Pokale sowie Gutscheine der Sponsoren.</li>
                    <li>Die Erstplatzierten jeder Trostrunde erhalten ebenfalls einen Ehrenpreis.</li>
                </ul>
            </td>
        </tr>
        <tr>
            <td class="label-col">TISCHE / BÄLLE</td>
            <td class="val-col">Anzahl Tische: 16 Wettkampftische. BÄLLE: NITTAKU JAPAN *** WEISS PLASTIK</td>
        </tr>
        <tr>
            <td class="label-col">VERPFLEGUNG</td>
            <td class="val-col">Für reichhaltige Verpflegung ist während des gesamten Turniers gesorgt (Grill, Salate, Pasta, Sandwiches, Kuchen & Getränke).</td>
        </tr>
    </table>

    <div class="footer-note">
        Wir freuen uns, Euch zum Turnier <strong>„${tournamentName}“</strong> begrüssen zu dürfen!
    </div>
    
    <div class="footer-sign">
        ${organizerName} – Turnierorganisation ${assocCode}
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>`;

    // Create an iframe to print cleanly without leaving the page or popup blocker issues
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 60000);
    }
}

