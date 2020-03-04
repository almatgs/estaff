function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;
}


function image_url()
{
	if ( is_active )
		return '//base_pict/contact_list.ico';
	else
		return '//base_pict/contact_list_inactive.ico';
}


function is_active()
{
	return ! is_archived;
}


function select_members()
{
	for ( personID in lib_base.select_objects_from_view( 'persons', {is_candidate:false} ) )
	{
		members.ObtainChildByKey( personID );
	}

	Doc.UpdateValues();
}


