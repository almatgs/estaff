function init_active_user()
{
	use_groups = ArrayCount( groups ) != 0;

	if ( ! UseLds )
	{
		if ( ( userLogin = AppConfig.GetOptProperty( 'debug-user-login' ) ) != undefined )
		{
			user = ArrayOptFindByKey( users, userLogin, 'login' );
			if ( user == undefined )
				throw UserError( 'Debug user not found: ' + userLogin );

			active_user_doc_ref = DefaultDb.OpenObjectDoc( 'user', user.id );
			active_user_access_ref = active_user_info.access_role_id.ForeignElem;
			return;
		}

		active_user_doc_ref = OpenNewDoc( 'base2_user.xmd', 'separate=1' );
		active_user_doc_ref.Object.TopElem.is_active = true;

		doc = OpenNewDoc( 'base2_access_role.xmd', 'separate=1' );
		doc.IsSeparated = false;

		active_user_access_ref = doc.TopElem;
		active_user_access.allow_all = true;

		return;
	}

	if ( LdsCurAuthObjectUrl != '' && ObjectNameFromUrl( LdsCurAuthObjectUrl ) == 'person' )
	{
		is_person_login = true;

		active_user_doc_ref = OpenNewDoc( 'base2_user.xmd', 'separate=1' );
		active_user_doc_ref.Object.TopElem.is_active = true;

		active_user_info.person_id = LdsCurUserID;

		doc = OpenNewDoc( 'base2_access_role.xmd', 'separate=1' );
		doc.IsSeparated = false;

		active_user_access_ref = doc.TopElem;
	}
	else if ( LdsCurUserID != null )
	{
		active_user_doc_ref = DefaultDb.OpenObjectDoc( 'user', LdsCurUserID );
		active_user_access_ref = active_user_info.access_role_id.ForeignElem;

		if ( base1_config.use_security_admin_role )
			is_security_admin = CallServerMethod( 'lib_user', 'IsUserSecurityAdmin', [{login:active_user_info.login}] );
	}
	else if ( true || IsLdsAdmin )
	{
		active_user_doc_ref = OpenNewDoc( 'base2_user.xmd', 'separate=1' );
		active_user_doc_ref.Object.TopElem.is_active = true;

		doc = OpenNewDoc( 'base2_access_role.xmd', 'separate=1' );
		doc.IsSeparated = false;

		active_user_access_ref = doc.TopElem;
		active_user_access.allow_all = true;
	}
	else
	{
		throw 'init_active_user() failed';
	}
}


function check_real_user()
{
	if ( ! UseLds || LdsCurUserID != null )
		return;

	lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.user_not_real );
}


function allow_list_copy()
{
	return ( ! active_user_access.prohibit_list_copy );
}


function set_catalog_constraints()
{
	if ( lib_user.active_user_access.prohibit_view_other_group_orgs )
	{
		lib_user.register_catalog_filter_group_constraint( 'orgs' );
		lib_user.register_catalog_filter_idata_group_constraint( 'orgs' );
	}

	if ( lib_user.active_user_access.prohibit_view_other_user_events )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'events', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );
	}
	else if ( lib_user.active_user_access.prohibit_view_other_group_events )
	{
		lib_user.register_catalog_filter_group_constraint( 'events' );
		lib_user.register_catalog_filter_idata_group_constraint( 'events' );
	}

	if ( ! lib_user.active_user_access.allow_all )
	{
		filterConstraint = lib_base.register_catalog_filter_constraint( 'notifications', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );

		filterConstraint = lib_base.register_catalog_filter_constraint( 'phone_call_records', 'user_id' );
		filterConstraint.value.ObtainByValue( lib_user.active_user_info.id );
	}
}


function register_catalog_filter_group_constraint( catalogName )
{
	filterConstraint = lib_base.register_catalog_filter_constraint( catalogName, 'group_id' );
	filterConstraint.value.ObtainByValue( lib_user.active_user_info.main_group_id );

	if ( lib_user.active_user_info.main_group_id.HasValue )
	{
		for ( group in lib_user.active_user_info.main_group_id.ForeignElem.get_implicit_groups_array() )
			filterConstraint.value.ObtainByValue( group.id );
	}
}


function register_catalog_filter_idata_group_constraint( catalogName )
{
	filterConstraint = lib_base.register_catalog_filter_constraint( catalogName, 'idata_group_id' );
	filterConstraint.value.ObtainByValue( lib_user.active_user_info.main_group_id );

	if ( lib_user.active_user_info.main_group_id.HasValue )
	{
		for ( group in lib_user.active_user_info.main_group_id.ForeignElem.get_implicit_groups_array() )
			filterConstraint.value.ObtainByValue( group.id );
	}
}


function GetCurrentUserPerson()
{
	if ( LdsIsClient )
		return this.active_user_person;

	user = GetForeignElem( users, LdsCurUserID );
	return user.person_id.ForeignElem;
}


function GetCurrentUserIdataBaseDivisions()
{
	if ( active_user_info.base_divisions.ChildNum != 0 )
		srcArray = active_user_info.base_divisions;
	else
		srcArray = active_user_info.main_group_id.ForeignElem.base_divisions;
		
	idArray = new Array;

	for ( baseDivision in srcArray )
	{
		queryStr = 'for $elem in divisions';
		queryStr += ' where IsHierChildOrSelf( $elem/id, ' + XQueryLiteral( baseDivision.division_id ) + ' )'
		queryStr += ' order by $elem/Hier()';
		queryStr += ' return $elem/Fields( \'id\' )';

		array = XQuery( queryStr );
		idArray.AddArray( ArrayExtract( array, 'id.Value' ) );
	}

	idArray = ArraySelectDistinct( idArray );
	return idArray;
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function IsUserSecurityAdmin( user )
{
	return ( base1_config.security_admins.GetOptChildByKey( user.login, 'login' ) != undefined );
}