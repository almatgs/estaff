function init()
{
	queryObject = UrlQuery( Doc.Url );
	viewID = queryObject.view_id;

	param_ref = lib_view.build_view_param( viewID, undefined );

	view_id = viewID;
	view_ref = param.view;

	filterFormElem = lib_view.build_filter_form( param );
	filterElem = CreateElemByFormElem( filterFormElem );

	filter_ref = filterElem;
	//alert( filter.FormElem.Xml );


	if ( view.deferred_set_sel_action != '' )
		Ps.preview.timer_started = false;

	if ( view.before_init_action.HasValue )
		eval( view.before_init_action );
}


