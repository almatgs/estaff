function Init()
{
	if ( ! lib_user.active_user_access.allow_all )
		this.filter.user_id = lib_user.active_user_info.id;

	//Screen.SetTimer( 'Ps.OnTimer', 1000 )
}


function OnTimer()
{
	//DropXQueryCache( ObjectDocUrl( 'data', 'phone_call_record', 1 ) );
	Screen.Update();
}