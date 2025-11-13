import { useQuery } from '@tanstack/react-query';
import { API } from 'aws-amplify';

// Fetch all public events
export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', '/public/events');
      return response || [];
    },
    staleTime: 5 * 60 * 1000
  });
};

// Fetch single event
export const useEvent = (eventId) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/public/events/${eventId}`);
      return response;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000
  });
};

// Fetch event categories
export const useEventCategories = (eventId) => {
  return useQuery({
    queryKey: ['eventCategories', eventId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/public/categories?eventId=${eventId}`);
      return response || [];
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000
  });
};

// Fetch event WODs
export const useEventWods = (eventId) => {
  return useQuery({
    queryKey: ['eventWods', eventId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/public/wods?eventId=${eventId}`);
      return response || [];
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000
  });
};
