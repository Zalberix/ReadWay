import { Tabs } from 'expo-router';
import { Image, View } from 'react-native';
import HomeIcon from '@/assets/icons/home.svg';
import GoalIcon from '@/assets/icons/goal.svg';
import StatsIcon from '@/assets/icons/stats.svg';
import BooksIcon from '@/assets/icons/books.svg';


export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#1E1E1E',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => (
            <HomeIcon width={24} height={24} color={color}/>
          ),
        }}
      />
      <Tabs.Screen
        name="goal"
        options={{
          title: 'Цель',
          tabBarIcon: ({ color }) => (
            <GoalIcon width={24} height={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Статистика',
          tabBarIcon: ({ color }) => (
            <StatsIcon width={24} height={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: 'Книги',
          tabBarIcon: ({ color }) => (
            <BooksIcon width={24} height={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
