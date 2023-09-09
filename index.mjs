import fs from 'fs'
import csv from 'csv-parser'
import { format } from 'fast-csv'
import chalk from 'chalk'

console.log(chalk.green.bold('Lancement du script ! 🚀'))

const rightHolders = {
    alexandreLegallicier: 'Alexandre Legallicier',
    yanisHadjar: 'Yanis Hadjar',
}

const TRACKS = [
    {
        isrc: 'QZ-HN6-20-13061',
        name: 'Alice',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.2,
            },
        ],
    },
    {
        isrc: 'QZ-MEN-20-32895',
        name: 'Fragments',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.2,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.2,
            },
        ],
    },
    {
        isrc: 'QZ-NWX-20-78401',
        name: 'Prosecco',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
    {
        isrc: 'QZ-DA4-21-05743',
        name: "La fin de l'histoire",
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
    {
        isrc: 'QZ-DA4-21-05744',
        name: 'La mauvaise herbe',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
    {
        isrc: 'FR-X76-21-64425',
        name: 'Les choses qui brillent',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
    {
        isrc: 'FR-X76-21-65458',
        name: 'Comme un chien',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
    {
        isrc: 'FR-X76-21-65460',
        name: 'Toi & moi',
        rightHolders: [
            {
                name: rightHolders.alexandreLegallicier,
                percentage: 0.15,
            },
            {
                name: rightHolders.yanisHadjar,
                percentage: 0.15,
            },
        ],
    },
]

function getLastSemester() {
    const semesters = fs.readdirSync('./reports').sort((a, b) => {
        const [semA, yearA] = a.split('-')
        const [semB, yearB] = b.split('-')
        if (yearA !== yearB) {
            return yearA.localeCompare(yearB)
        }
        return semA.localeCompare(semB)
    })
    return semesters[semesters.length - 1]
}

const lastSemester = getLastSemester()

function processReport(callback) {
    const earnings = {}
    const reports = fs.readdirSync(`./reports/${lastSemester}`).sort()

    let processedReports = 0

    reports.forEach((report) => {
        fs.createReadStream(`./reports/${lastSemester}/${report}`)
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                const isrc = row['ISRC']
                const netRevenue = parseFloat(row['Revenu Net'])

                const track = TRACKS.find((t) => t.isrc === isrc)
                if (track) {
                    for (const rightHolder of track.rightHolders) {
                        const key = `${track.name} - ${rightHolder.name}`
                        if (!earnings[key]) {
                            earnings[key] = {
                                Musique: track.name,
                                'Ayant-Droit': rightHolder.name,
                                Pourcentage: rightHolder.percentage * 100,
                                'Revenus Net': 0,
                            }
                        }
                        earnings[key]['Revenus Net'] +=
                            netRevenue * rightHolder.percentage
                    }
                }
            })
            .on('end', () => {
                processedReports++
                if (processedReports === reports.length) {
                    callback(earnings)
                }
            })
    })
}

processReport((earnings) => {
    const csvStream = format({ headers: true })
    const writableStream = fs.createWriteStream(
        `./recaps/${lastSemester}/recap.csv`
    )

    csvStream
        .pipe(writableStream)
        .on('end', () => console.log(`CSV file written for ${lastSemester}`))

    const totalEarningsPerRightHolder = {}

    Object.values(earnings).forEach((e) => {
        e['Revenus Net'] = e['Revenus Net'].toFixed(2)
        csvStream.write(e)

        if (!totalEarningsPerRightHolder[e['Ayant-Droit']]) {
            totalEarningsPerRightHolder[e['Ayant-Droit']] = 0
        }
        totalEarningsPerRightHolder[e['Ayant-Droit']] += parseFloat(
            e['Revenus Net']
        )
    })
    csvStream.end()

    let emailBody = `Cher(e) ayant droit,\n\nNous avons le plaisir de vous présenter le récapitulatif des redevances dues pour le semestre ${lastSemester} :\n\n`
    for (const [rightHolder, total] of Object.entries(
        totalEarningsPerRightHolder
    )) {
        emailBody += `- M. ${rightHolder} : ${total.toFixed(2)} EUR\n`
    }
    emailBody += `\nNous vous prions de bien vouloir nous adresser votre facture correspondante afin de procéder au virement dans les plus brefs délais.\n\nNous restons à votre disposition pour toute information complémentaire.\n\nCordialement,\n\nL'équipe de Petit Voyou Music`

    const mailDir = `./recaps/${lastSemester}`
    if (!fs.existsSync(mailDir)) {
        fs.mkdirSync(mailDir, { recursive: true })
    }

    const mailPath = `${mailDir}/mail.txt`
    fs.writeFileSync(mailPath, emailBody, 'utf8')
    console.log(chalk.yellow(`- ${mailDir}/recap.csv`))
    console.log(chalk.yellow(`- ${mailPath}`))
    console.log(chalk.green.bold('\nLe script est terminé ! ✅'))
})
