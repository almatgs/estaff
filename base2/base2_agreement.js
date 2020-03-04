function OnCreate()
{
	currency_id = global_settings.default_currency_id;
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( userAccess.prohibit_view_agreements )
		Cancel();
}


function image_url()
{
	return '//base_pict/agreement.ico';
}


function check_before_screen_save()
{
	if ( ! date.HasValue )
		throw UserError( UiText.errors.mandatory_fields_not_specified );
}


