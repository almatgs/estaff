function handle_select_elem_field( array, destItem, okActionCode )
{
	dlgDoc = OpenDoc( 'base1_dlg_elem_select_web.xml' );
	dlgDoc.TopElem.array_ref = array;
	dlgDoc.TopElem.multi_select = false;
	dlgDoc.TopElem.dest_item_ref = destItem;
	
	//ActiveScreen.ModalDlg( dlg );
	//return ArrayFirstElem( dlg.TopElem.sel_array );

	dlgDoc.TopElem.ok_action_code = okActionCode;
	//alert( dlgDoc.TopElem.Xml );
	CreateDocScreen( dlgDoc );
}


function handle_select_catalog_record_field( catalog, filterObj, destItem, okActionCode )
{
	dlgDoc = OpenDoc( 'base1_dlg_elem_select_web.xml' );
	dlgDoc.TopElem.catalog_ref = catalog;
	dlgDoc.TopElem.filter_obj_ref = filterObj;
	dlgDoc.TopElem.multi_select = false;
	dlgDoc.TopElem.dest_item_ref = destItem;
	
	//ActiveScreen.ModalDlg( dlg );
	//return ArrayFirstElem( dlg.TopElem.sel_array );

	dlgDoc.TopElem.ok_action_code = okActionCode;
	//alert( dlgDoc.TopElem.Xml );
	screen = CreateDocScreen( dlgDoc );
	screen.ConfirmDocSave = false;
}
