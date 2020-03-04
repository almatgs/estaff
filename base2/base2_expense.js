function OnCreate()
{
	user_id = LdsCurUserID;
	currency_id = global_settings.default_currency_id;
}


function OnBeforeSave()
{
	ft_secondary_text = org_id.ForeignDispName;
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( userAccess.prohibit_view_expenses )
		Cancel();
}


function image_url()
{
	return '//base_pict/expense.ico';
}




