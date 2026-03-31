import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Veritabanı seed başlatılıyor...");

  // Demo kullanıcı oluştur
  const passwordHash = await bcrypt.hash("demo123", 12);
  const demoUser = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      username: "demo",
      passwordHash,
      displayName: "Demo Kullanıcı",
    },
  });

  await prisma.userStats.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id },
  });

  // Demo deste: A1 Temel Kelimeler
  const deck1 = await prisma.deck.create({
    data: {
      userId: demoUser.id,
      name: "A1 Temel Kelimeler",
      description: "Almanca A1 seviyesi temel kelimeler",
      color: "#6366F1",
      newPerDay: 20,
      reviewPerDay: 200,
    },
  });

  // Demo kartlar
  const cards = [
    {
      word: "Haus",
      wordTranslation: "ev",
      artikel: "das",
      plural: "Häuser",
      nominativ: "das Haus",
      akkusativ: "das Haus",
      dativ: "dem Haus",
      exampleSentence: "Das Haus ist groß.",
      sentenceTranslation: "Ev büyüktür.",
    },
    {
      word: "Hund",
      wordTranslation: "köpek",
      artikel: "der",
      plural: "Hunde",
      nominativ: "der Hund",
      akkusativ: "den Hund",
      dativ: "dem Hund",
      exampleSentence: "Der Hund spielt im Garten.",
      sentenceTranslation: "Köpek bahçede oynuyor.",
    },
    {
      word: "Katze",
      wordTranslation: "kedi",
      artikel: "die",
      plural: "Katzen",
      nominativ: "die Katze",
      akkusativ: "die Katze",
      dativ: "der Katze",
      exampleSentence: "Die Katze schläft auf dem Sofa.",
      sentenceTranslation: "Kedi kanepede uyuyor.",
    },
    {
      word: "Buch",
      wordTranslation: "kitap",
      artikel: "das",
      plural: "Bücher",
      nominativ: "das Buch",
      akkusativ: "das Buch",
      dativ: "dem Buch",
      exampleSentence: "Ich lese ein Buch.",
      sentenceTranslation: "Bir kitap okuyorum.",
    },
    {
      word: "Schule",
      wordTranslation: "okul",
      artikel: "die",
      plural: "Schulen",
      nominativ: "die Schule",
      akkusativ: "die Schule",
      dativ: "der Schule",
      exampleSentence: "Die Kinder gehen in die Schule.",
      sentenceTranslation: "Çocuklar okula gidiyor.",
    },
    {
      word: "Wasser",
      wordTranslation: "su",
      artikel: "das",
      plural: null,
      nominativ: "das Wasser",
      akkusativ: "das Wasser",
      dativ: "dem Wasser",
      exampleSentence: "Ich trinke Wasser.",
      sentenceTranslation: "Su içiyorum.",
    },
    {
      word: "Auto",
      wordTranslation: "araba",
      artikel: "das",
      plural: "Autos",
      nominativ: "das Auto",
      akkusativ: "das Auto",
      dativ: "dem Auto",
      exampleSentence: "Das Auto ist rot.",
      sentenceTranslation: "Araba kırmızıdır.",
    },
    {
      word: "Mann",
      wordTranslation: "adam, erkek",
      artikel: "der",
      plural: "Männer",
      nominativ: "der Mann",
      akkusativ: "den Mann",
      dativ: "dem Mann",
      exampleSentence: "Der Mann liest eine Zeitung.",
      sentenceTranslation: "Adam bir gazete okuyor.",
    },
    {
      word: "Frau",
      wordTranslation: "kadın, bayan",
      artikel: "die",
      plural: "Frauen",
      nominativ: "die Frau",
      akkusativ: "die Frau",
      dativ: "der Frau",
      exampleSentence: "Die Frau kocht das Essen.",
      sentenceTranslation: "Kadın yemeği pişiriyor.",
    },
    {
      word: "Kind",
      wordTranslation: "çocuk",
      artikel: "das",
      plural: "Kinder",
      nominativ: "das Kind",
      akkusativ: "das Kind",
      dativ: "dem Kind",
      exampleSentence: "Das Kind spielt mit dem Ball.",
      sentenceTranslation: "Çocuk topla oynuyor.",
    },
    {
      word: "Tisch",
      wordTranslation: "masa",
      artikel: "der",
      plural: "Tische",
      nominativ: "der Tisch",
      akkusativ: "den Tisch",
      dativ: "dem Tisch",
      exampleSentence: "Das Buch liegt auf dem Tisch.",
      sentenceTranslation: "Kitap masanın üstünde duruyor.",
    },
    {
      word: "Stuhl",
      wordTranslation: "sandalye",
      artikel: "der",
      plural: "Stühle",
      nominativ: "der Stuhl",
      akkusativ: "den Stuhl",
      dativ: "dem Stuhl",
      exampleSentence: "Bitte setzen Sie sich auf den Stuhl.",
      sentenceTranslation: "Lütfen sandalyeye oturun.",
    },
  ];

  for (const card of cards) {
    await prisma.card.create({
      data: {
        deckId: deck1.id,
        ...card,
      },
    });
  }

  // Demo deste 2: Fiiller
  const deck2 = await prisma.deck.create({
    data: {
      userId: demoUser.id,
      name: "A1 Fiiller",
      description: "Temel Almanca fiiller ve çekimleri",
      color: "#22C55E",
      newPerDay: 15,
      reviewPerDay: 150,
    },
  });

  const verbs = [
    {
      word: "gehen",
      wordTranslation: "gitmek",
      artikel: "-",
      exampleSentence: "Ich gehe in die Schule.",
      sentenceTranslation: "Okula gidiyorum.",
      notes: "ich gehe, du gehst, er/sie/es geht",
    },
    {
      word: "kommen",
      wordTranslation: "gelmek",
      artikel: "-",
      exampleSentence: "Woher kommen Sie?",
      sentenceTranslation: "Nereden geliyorsunuz?",
      notes: "ich komme, du kommst, er/sie/es kommt",
    },
    {
      word: "essen",
      wordTranslation: "yemek",
      artikel: "-",
      exampleSentence: "Wir essen zusammen.",
      sentenceTranslation: "Birlikte yemek yiyoruz.",
      notes: "ich esse, du isst, er/sie/es isst",
    },
    {
      word: "trinken",
      wordTranslation: "içmek",
      artikel: "-",
      exampleSentence: "Ich trinke gerne Kaffee.",
      sentenceTranslation: "Kahve içmeyi severim.",
      notes: "ich trinke, du trinkst, er/sie/es trinkt",
    },
    {
      word: "sprechen",
      wordTranslation: "konuşmak",
      artikel: "-",
      exampleSentence: "Sprechen Sie Deutsch?",
      sentenceTranslation: "Almanca konuşuyor musunuz?",
      notes: "ich spreche, du sprichst, er/sie/es spricht",
    },
    {
      word: "lernen",
      wordTranslation: "öğrenmek",
      artikel: "-",
      exampleSentence: "Ich lerne Deutsch.",
      sentenceTranslation: "Almanca öğreniyorum.",
      notes: "ich lerne, du lernst, er/sie/es lernt",
    },
  ];

  for (const verb of verbs) {
    await prisma.card.create({
      data: {
        deckId: deck2.id,
        ...verb,
      },
    });
  }

  console.log(`Seed tamamlandı: ${cards.length + verbs.length} kart oluşturuldu`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
