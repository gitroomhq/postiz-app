import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';

export const NewSubscription = () =>{
  const query = useSearchParams();
  const fireEvents = useFireEvents();

   useEffect(() => {
    const check = query.get('check');
    if (check) {
      fireEvents('purchase');
    }
  }, [query]);

   return null;
}