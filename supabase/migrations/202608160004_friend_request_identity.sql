drop policy if exists "Users can delete their friend requests"
on public.friend_requests;

create or replace function public.protect_friend_request_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sender_id := old.sender_id;
  new.receiver_id := old.receiver_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_friend_request_identity
on public.friend_requests;
create trigger protect_friend_request_identity
before update on public.friend_requests
for each row execute function public.protect_friend_request_identity();