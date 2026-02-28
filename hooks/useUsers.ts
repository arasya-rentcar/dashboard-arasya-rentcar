import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { User } from '@/types';

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.list();
      return res.data.data;
    },
  });
}
