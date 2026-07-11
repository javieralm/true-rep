import { PrismaClient, AchievementCondition } from "@prisma/client";

const prisma = new PrismaClient();

const achievements: {
  name: string;
  description: string;
  icon_url: string;
  unlock_condition: AchievementCondition;
}[] = [
  { name: "First Rep", description: "Complete your first workout", icon_url: "/badges/first-workout.png", unlock_condition: "FIRST_WORKOUT" },
  { name: "On Fire", description: "7-day workout streak", icon_url: "/badges/streak-7.png", unlock_condition: "STREAK_7" },
  { name: "Unstoppable", description: "30-day workout streak", icon_url: "/badges/streak-30.png", unlock_condition: "STREAK_30" },
  { name: "Century", description: "Earn 100 XP", icon_url: "/badges/xp-100.png", unlock_condition: "XP_100" },
  { name: "Elite", description: "Earn 500 XP", icon_url: "/badges/xp-500.png", unlock_condition: "XP_500" },
  { name: "Routine Master", description: "Complete a full routine", icon_url: "/badges/routine.png", unlock_condition: "COMPLETE_ROUTINE" },
  { name: "Champion", description: "Win a challenge", icon_url: "/badges/champion.png", unlock_condition: "CHALLENGE_WIN" },
];

async function main() {
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { unlock_condition: a.unlock_condition },
      update: a,
      create: a,
    });
  }
  console.log(`Seeded ${achievements.length} achievements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
